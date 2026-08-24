import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      maxlength: [30, "Username must be 30 characters or fewer"],
      default: "",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never return password by default
    },
    // Each code is stored hashed, never in plaintext — same treatment as
    // the password itself. `used` codes stay in the array (so history is
    // visible if ever needed) but are never matched again; resetPassword
    // replaces a used code's hash in place with a freshly generated one.
    backupCodes: {
      type: [
        {
          codeHash: { type: String, required: true },
          used: { type: Boolean, default: false },
        },
      ],
      default: [],
      select: false,
    },
    // Set whenever backup codes are (re)generated. Not select:false — unlike
    // the codes themselves, a generation date reveals nothing secret, so
    // the status endpoint can read it without requiring a password.
    backupCodesGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving, only if it changed.
// IMPORTANT: this hook is `async`, so Mongoose does NOT pass a real `next`
// callback to it — it just awaits the returned promise instead. Declaring
// a `next` parameter and calling it (the old callback-style pattern) throws
// `TypeError: next is not a function` here, since `next` is actually
// undefined for async hooks. Don't mix async/await with next() — use one
// or the other, never both.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Strip password and backup code hashes if a doc is ever serialized directly
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.backupCodes;
    return ret;
  },
});

export default mongoose.model("User", userSchema);