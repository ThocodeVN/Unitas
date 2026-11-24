import crypto from "crypto";
import User from "../models/User.js";
import { setAuthCookie, cookieOptions } from "../utils/token.js";

const FB_VERSION = "v24.0"; // đổi nếu Meta yêu cầu phiên bản mới hơn

const fetchJson = async (url, options, errorText) => {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(errorText);
  return r.json();
};

const providers = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email profile",
    idField: "googleId",
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    async exchangeCode(code, redirectUri) {
      const data = await fetchJson(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        },
        "Google từ chối mã đăng nhập",
      );
      return data.access_token;
    },
    async getProfile(accessToken) {
      const p = await fetchJson(
        "https://openidconnect.googleapis.com/v1/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } },
        "Không lấy được thông tin từ Google",
      );
      return {
        id: p.sub,
        email: p.email,
        emailVerified: p.email_verified === true,
        name: p.name,
        avatar: p.picture,
      };
    },
  },

  facebook: {
    authUrl: `https://www.facebook.com/${FB_VERSION}/dialog/oauth`,
    scope: "public_profile,email",
    idField: "facebookId",
    clientId: () => process.env.FACEBOOK_APP_ID,
    clientSecret: () => process.env.FACEBOOK_APP_SECRET,
    async exchangeCode(code, redirectUri) {
      const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      });
      const data = await fetchJson(
        `https://graph.facebook.com/${FB_VERSION}/oauth/access_token?${params}`,
        undefined,
        "Facebook từ chối mã đăng nhập",
      );
      return data.access_token;
    },
    async getProfile(accessToken) {
      const params = new URLSearchParams({
        fields: "id,name,email,picture.type(large)",
        access_token: accessToken,
      });
      const p = await fetchJson(
        `https://graph.facebook.com/${FB_VERSION}/me?${params}`,
        undefined,
        "Không lấy được thông tin từ Facebook",
      );
      return {
        id: p.id,
        email: p.email,
        emailVerified: false, // Facebook không cho biết email đã xác minh hay chưa
        name: p.name,
        avatar: p.picture?.data?.url,
      };
    },
  },
};

const redirectUriOf = (name) =>
  `${process.env.PUBLIC_API_URL}/auth/${name}/callback`;
const fail = (res, code) =>
  res.redirect(`${process.env.CLIENT_URL}/login?error=${code}`);
const stateCookie = { ...cookieOptions, sameSite: "lax" };

async function makeUsername(email) {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, "")
      .slice(0, 20) || "user";
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}${crypto.randomInt(1000, 10000)}`;
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  return `user${crypto.randomBytes(6).toString("hex")}`;
}

async function findOrCreateUser(provider, profile) {
  const idField = providers[provider].idField;

  // 1. Đã từng đăng nhập bằng nhà cung cấp này
  let user = await User.findOne({ [idField]: profile.id });
  if (user) return { user };

  if (!profile.email) return { error: "no_email" };
  const email = profile.email.toLowerCase();

  // 2. Email đã có tài khoản
  user = await User.findOne({ email });
  if (user) {
    // Chỉ tự liên kết khi nhà cung cấp xác nhận email là thật
    if (!profile.emailVerified) return { error: "email_exists" };
    user[idField] = profile.id;
    if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
    await user.save();
    return { user };
  }

  // 3. Người mới
  user = await User.create({
    fullName: profile.name || email.split("@")[0],
    email,
    username: await makeUsername(email),
    avatar: profile.avatar || "",
    [idField]: profile.id,
  });
  return { user };
}

export const startOAuth = (name) => (req, res) => {
  const p = providers[name];
  if (!p.clientId() || !p.clientSecret()) return fail(res, "not_configured");

  // "state" chống giả mạo: ghi vào cookie rồi so lại khi quay về
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, { ...stateCookie, maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: p.clientId(),
    redirect_uri: redirectUriOf(name),
    response_type: "code",
    scope: p.scope,
    state,
  });
  res.redirect(`${p.authUrl}?${params}`);
};

export const finishOAuth = (name) => async (req, res) => {
  const p = providers[name];
  const { code, state, error } = req.query;
  const savedState = req.cookies?.oauth_state;
  res.clearCookie("oauth_state", stateCookie);

  if (error) return fail(res, "cancelled");
  if (!code || !state || state !== savedState)
    return fail(res, "invalid_state");

  try {
    const accessToken = await p.exchangeCode(code, redirectUriOf(name));
    const profile = await p.getProfile(accessToken);
    const { user, error: err } = await findOrCreateUser(name, profile);
    if (err) return fail(res, err);

    setAuthCookie(res, user._id);
    return res.redirect(`${process.env.CLIENT_URL}/`);
  } catch (e) {
    console.error(`Lỗi đăng nhập ${name}:`, e.message);
    return fail(res, "server_error");
  }
};
