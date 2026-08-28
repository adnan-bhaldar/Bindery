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

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return res.status(400).json({ message: "Settings payload must be an object" });
    }

    // Shallow-merge at the top level instead of overwriting `data` wholesale.
    // Previously `{ data }` replaced the entire blob, so if device A synced
    // `{ theme: "dark" }` and device B synced `{ ocrLanguage: "fra" }`
    // moments later, B's write wiped out A's theme change entirely — neither
    // device sent the other's keys, so whichever write landed last silently
    // erased them. Building this as $set: { "data.<key>": value } per
    // incoming key applies each key independently and atomically: a key
    // this request doesn't mention is left untouched, no matter what else
    // changed it concurrently. This doesn't resolve two devices changing
    // the *same* key at the same instant (last write still wins there,
    // same as before) — only prevents keys becoming collateral damage in
    // an unrelated update.
    const keys = Object.keys(data);

    // Dots would be reinterpreted as nested-path separators by Mongo's dot
    // notation below, letting a key like "a.b" reach into unrelated nested
    // fields instead of setting a literal top-level key named "a.b".
    // Settings keys are plain identifiers on the frontend, so reject
    // anything that isn't one rather than silently mismapping it.
    const invalidKey = keys.find((key) => key.includes(".") || key.startsWith("$"));
    if (invalidKey) {
      return res.status(400).json({ message: `Invalid settings key: "${invalidKey}"` });
    }

    const setOps = {};
    for (const key of keys) {
      setOps[`data.${key}`] = data[key];
    }

    const settings = await Settings.findOneAndUpdate(
      { user: req.user._id },
      Object.keys(setOps).length > 0 ? { $set: setOps } : {},
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ data: settings.data, updatedAt: settings.updatedAt });
  } catch (error) {
    next(error);
  }
};