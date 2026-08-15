import Settings from "../models/Settings.js";

// GET /api/settings
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });

    // Self-heal: older accounts may not have a settings doc yet
    if (!settings) {
      settings = await Settings.create({ user: req.user._id, data: {} });
    }

    res.status(200).json({ data: settings.data, updatedAt: settings.updatedAt });
  } catch (error) {
    next(error);
  }
};

// PUT /api/settings
export const updateSettings = async (req, res, next) => {
  try {
    const { data } = req.body;

    if (typeof data !== "object" || data === null) {
      return res.status(400).json({ message: "Settings payload must be an object" });
    }

    const settings = await Settings.findOneAndUpdate(
      { user: req.user._id },
      { data },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    res.status(200).json({ data: settings.data, updatedAt: settings.updatedAt });
  } catch (error) {
    next(error);
  }
};