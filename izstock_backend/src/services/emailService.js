const config = require('../config');
const { AppError } = require('../errors');
const Mailgun = require('mailgun.js');

exports.sendCode = async (email, code) => {
  if(config.verificationMode==="console"){
    console.log(`Code for ${email}: ${code}`)
  }else{
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: config.mailgun.apiKey,
    });
    try {
      console.log(config.mailgun.sandboxDomain)
      const data = await mg.messages.create(config.mailgun.sandboxDomain, {
        from: `IZStock <postmaster@${config.mailgun.sandboxDomain}>`,
        to: [`Isabelle Johnson <${email}>`],
        subject: "Hello Isabelle Johnson",
        text: `Welcome to IZStock!
              \nHere is your code: ${code}`,
      });

      console.log(data); // logs response data
    } catch (error) {
      console.log(error); //logs any error
      throw new AppError(502, 'EMAIL_FAILED', 'Something went wrong trying to send verification email')
    }
  }

};