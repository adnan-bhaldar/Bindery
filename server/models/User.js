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

// Strip password if a doc is ever serialized directly
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model("User", userSchema);