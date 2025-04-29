const twilio = require('twilio');
require('dotenv').config();

// Validate environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('Twilio credentials are missing. Please check your .env file.');
    console.error('Required variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
}

const client = new twilio(accountSid, authToken);

const sendSMS = async (to, message) => {
    try {
        // Validate phone number format
        if (!to.startsWith('+')) {
            to = '+91' + to; // Add country code for India
        }

        const response = await client.messages.create({
            body: message,
            to: to,
            from: twilioPhoneNumber
        });
        console.log('SMS sent successfully:', response.sid);
        return response;
    } catch (error) {
        console.error('Error sending SMS:', error);
        if (error.code === 20003) {
            console.error('Authentication error: Please check your Twilio credentials');
        } else if (error.code === 21211) {
            console.error('Invalid phone number format');
        }
        throw error;
    }
};

module.exports = {
    sendSMS
}; 