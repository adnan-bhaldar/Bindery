import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one settings doc per user
    },
    // Free-form settings blob — keeps the backend agnostic of the exact
    // shape of Bindery's local SettingsDialog state, so the frontend can
    // evolve its settings shape without needing a backend migration.
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
