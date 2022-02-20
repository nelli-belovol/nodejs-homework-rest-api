const express = require("express");
const router = express.Router();
const { PORT } = process.env;
const path = require("path");
const Jimp = require("jimp");
const fs = require("fs/promises");
const CreateError = require("http-errors");
const { authenticate, upload } = require("../../middlewares");

const { User, schemas } = require("../../models/user");

const { signup, login } = require("../../controllers/auth");

const { sendMail } = require("../../helpers/sendMail");

router.post("/signup", signup);

router.post("/login", login);

router.get("/current", authenticate, async (req, res, next) => {
  const { subscription } = req.user;
  res.json({
    email: req.user.email,
    subscription,
  });
});

router.get("/logout", authenticate, async (req, res, next) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });
  res.status(204).send();
});

router.patch("/current", authenticate, async (req, res, next) => {
  const { subscription } = req.body;
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { subscription });
  res.json({
    email: req.user.email,
    subscription,
  });
});

router.patch(
  "/avatars",
  authenticate,
  upload.single("avatar"),
  async (req, res, next) => {
    const avatarsDir = path.join(__dirname, "../../", "public", "avatars");

    const { path: tempUpload, filename } = req.file;
    const { _id } = req.user;
    try {
      const [extention] = filename.split(".").reverse();
      const newFileName = `${_id}.${extention}`;
      const resultUpload = path.join(avatarsDir, newFileName);

      Jimp.read(tempUpload, async (err, img) => {
        const imgRes = await img.resize(250, 250);
        await imgRes.write(tempUpload);
        await fs.rename(tempUpload, resultUpload);
        if (err) throw err;
      });

      const avatarURL = path.join(
        `http://localhost:${PORT}`,
        "avatars",
        newFileName
      );
      await User.findByIdAndUpdate(_id, { avatarURL });
      res.json({ avatarURL });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/verify/:verificationToken", async (req, res, next) => {
  try {
    const { verificationToken } = req.params;

    const user = await User.findOne({ verificationToken });
    if (!user) {
      throw new CreateError(404, "User not found");
    }
    const { _id } = user;
    await User.findByIdAndUpdate(_id, {
      verificationToken: null,
      verify: true,
    });
    res.status(200).json({ message: "Verification successful" });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { email } = req.body;
    const { error } = schemas.verify.validate(email);
    if (error) {
      throw new CreateError(400, "missing required field email");
    }

    const user = await User.findOnee(email);
    if (user.verify) {
      throw new CreateError(400, "Verification has already been passed");
    }
    const mail = {
      to: email,
      subject: "Повторное подтверждение имеил",
      html: `<a target="_black" href='http://localhost:4000/api/users/${user.verificationToken}'>Нажмите, чтобы подтвердить имеил`,
    };
    await sendMail(mail);
    sendMail.send();
    res.json({ message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
