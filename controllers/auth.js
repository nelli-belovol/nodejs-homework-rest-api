const CreateError = require("http-errors");
const gravatar = require("gravatar");
const { User, schemas } = require("../models/user");
const bcrypt = require("bcryptjs");
const { v4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = process.env;
const sendMail = require("../helpers/sendMail");
module.exports = {
  signup: async (req, res, next) => {
    try {
      const { error } = schemas.register.validate(req.body);
      if (error) {
        throw new CreateError(400, error.message);
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (user) {
        throw new CreateError(409, "Email in use");
      }

      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);

      const avatarURL = gravatar.url(email, { protocol: "https" });
      const verificationToken = v4();

      const result = await User.create({
        email,
        avatarURL,
        password: hashPassword,
        verificationToken,
      });
      const mail = {
        to: email,
        subject: "Подтверждение имеил",
        html: `<a target="_black" href='http://localhost:4000/api/users/${verificationToken}'>Нажмите, чтобы подтвердить имеил`,
      };
      await sendMail(mail);
      const { subscription } = result;
      res.status(201).json({ user: { email, subscription } });
    } catch (error) {
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      const { error } = schemas.register.validate(req.body);
      if (error) {
        throw new CreateError(400, error.message);
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        throw new CreateError(401, "Email or password is wrong");
      }
      if (!user.verify) {
        throw new CreateError(401, "Email not verify");
      }
      const compareResult = await bcrypt.compare(password, user.password);
      if (!compareResult) {
        throw new CreateError(401, "Email or password is wrong");
      }

      const { subscription } = user;
      const payload = { id: user._id };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
      await User.findByIdAndUpdate(user._id, { token });
      res.json({
        token,
        user: {
          email,
          subscription,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
