import request from "supertest";
import { setupTestDB, teardownTestDB, clearTestDB } from "./setup.js";

let app;

beforeAll(async () => {
    await setupTestDB();
    // Dynamic import so setupTestDB()'s env vars are in place BEFORE
    // server.js's top-level `await connectDB()` and startup checks run.
    // A static top-of-file `import app from "../server.js"` would execute
    // before beforeAll and connect to whatever MONGO_URI happened to already
    // be set (or crash on missing JWT_SECRET/CLIENT_ORIGIN).
    ({ default: app } = await import("../server.js"));
});

afterAll(async () => {
    await teardownTestDB();
});

afterEach(async () => {
    await clearTestDB();
});

describe("POST /api/auth/signup", () => {
    it("creates an account and sets an auth cookie", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ email: "new@example.com", password: "password123" });

        expect(res.status).toBe(201);
        expect(res.body.email).toBe("new@example.com");
        expect(res.headers["set-cookie"]?.[0]).toMatch(/^token=/);
    });

    it("rejects a password under 8 characters", async () => {
        const res = await request(app).post("/api/auth/signup").send({ email: "short@example.com", password: "abc123" });
        expect(res.status).toBe(400);
    });

    it("rejects a duplicate email with 409", async () => {
        await request(app).post("/api/auth/signup").send({ email: "dup@example.com", password: "password123" });
        const res = await request(app).post("/api/auth/signup").send({ email: "dup@example.com", password: "password123" });
        expect(res.status).toBe(409);
    });
});

describe("POST /api/auth/login", () => {
    const email = "logintest@example.com";
    const password = "correct-password";

    beforeEach(async () => {
        await request(app).post("/api/auth/signup").send({ email, password });
    });

    it("logs in with correct credentials", async () => {
        const res = await request(app).post("/api/auth/login").send({ email, password });
        expect(res.status).toBe(200);
    });

    it("rejects an incorrect password with a generic message", async () => {
        const res = await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid email or password");
    });

    it("gives the same generic message for a nonexistent email", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "whatever" });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid email or password");
    });

    // Covers the account-lockout fix: 5 consecutive wrong passwords should
    // lock the account, and a 6th attempt should be rejected with 423 even
    // when the CORRECT password is finally used — proving the password
    // isn't checked at all once locked, not just that wrong ones fail.
    it("locks the account after 5 failed attempts and rejects the correct password on the 6th try", async () => {
        for (let i = 0; i < 5; i++) {
            const res = await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
            expect(res.status).toBe(i === 4 ? 423 : 401);
        }

        const res = await request(app).post("/api/auth/login").send({ email, password });
        expect(res.status).toBe(423);
        expect(res.body.message).toMatch(/too many failed attempts/i);
    });

    it("clears the failure count after a successful login", async () => {
        await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
        await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
        const goodLogin = await request(app).post("/api/auth/login").send({ email, password });
        expect(goodLogin.status).toBe(200);

        // 4 more wrong attempts after a successful login shouldn't lock the
        // account — if the counter weren't cleared, this would be attempts
        // 3-6 of the original run and would trigger the lock.
        for (let i = 0; i < 4; i++) {
            await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
        }
        const stillUnlocked = await request(app).post("/api/auth/login").send({ email, password });
        expect(stillUnlocked.status).toBe(200);
    });
});

describe("session revocation via tokenVersion", () => {
    const email = "sessiontest@example.com";
    const password = "original-password";

    it("keeps the changing device logged in but logs out every other session", async () => {
        const signupRes = await request(app).post("/api/auth/signup").send({ email, password });
        const deviceACookie = signupRes.headers["set-cookie"];

        const loginRes = await request(app).post("/api/auth/login").send({ email, password });
        const deviceBCookie = loginRes.headers["set-cookie"];

        // Sanity check: both sessions work before the password change
        expect((await request(app).get("/api/auth/me").set("Cookie", deviceACookie)).status).toBe(200);
        expect((await request(app).get("/api/auth/me").set("Cookie", deviceBCookie)).status).toBe(200);

        const changeRes = await request(app)
            .put("/api/auth/password")
            .set("Cookie", deviceACookie)
            .send({ currentPassword: password, newPassword: "new-password-456" });
        expect(changeRes.status).toBe(200);
        const deviceANewCookie = changeRes.headers["set-cookie"];

        // Device A gets a fresh cookie in the response and stays logged in
        expect((await request(app).get("/api/auth/me").set("Cookie", deviceANewCookie)).status).toBe(200);

        // Device B's cookie predates the password change and must now be rejected
        const deviceBAfter = await request(app).get("/api/auth/me").set("Cookie", deviceBCookie);
        expect(deviceBAfter.status).toBe(401);
    });

    it("rejects changePassword when the current password is wrong", async () => {
        const signupRes = await request(app).post("/api/auth/signup").send({ email, password });
        const cookie = signupRes.headers["set-cookie"];

        const res = await request(app)
            .put("/api/auth/password")
            .set("Cookie", cookie)
            .send({ currentPassword: "totally-wrong", newPassword: "new-password-456" });

        expect(res.status).toBe(401);
    });
});

describe("GET /api/auth/me", () => {
    it("returns 401 with no cookie", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
    });
});