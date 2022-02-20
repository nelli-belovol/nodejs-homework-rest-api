const sgMail = require("@sendgrid/mail");
require("dotenv").config();

const { SENDGRID_API_KEY } = process.env;

sgMail.setApiKey(SENDGRID_API_KEY);

const sendMail = async (data) => {
  try {
    const mail = { ...data, from: "nelli199020@gmail.com" };
    await sgMail.send(mail);
    return true;
  } catch (err) {
    throw err.message;
  }
};

module.exports = sendMail;
