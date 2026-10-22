const config = require('../config');
const { AppError } = require('../errors');
const Mailgun = require('mailgun.js');

exports.sendCode = async (email, fName, lName, code, purpose) => {
  if(config.verificationMode==="console"){
    console.log(`Code for ${fName} ${lName} (${email}): ${code}\npurpous: ${purpose}`)
  }else{
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: config.mailgun.apiKey,
    });
    try {
      if(purpose === "registration"){
        const data = await mg.messages.create(config.mailgun.sandboxDomain, {
          from: `IZStock <postmaster@${config.mailgun.sandboxDomain}>`,
          to: [`${fName} ${lName} <${email}>`],
          subject: `Welcome to IZStock`,
          text: `Welcome to IZStock, ${fName} ${lName}!
                \nHere is your code to get registered: ${code}`,
        });
      }
      else if(purpose === "sign_in"){
        const data = await mg.messages.create(config.mailgun.sandboxDomain, {
          from: `IZStock <postmaster@${config.mailgun.sandboxDomain}>`,
          to: [`${fName} ${lName} <${email}>`],
          subject: `IZStock Sign in`,
          text: `Hey again, ${fName} ${lName}!
                \nHere is your code to get signed in: ${code}`,
        });
      }
      else {throw new AppError(502, 'EMAIL_FAILED', 'Invalid purpous was given.')}
    } catch (error) {
      console.log(error); //logs any error
      throw new AppError(502, 'EMAIL_FAILED', 'Something went wrong trying to send verification email')
    }
  }

};