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

// Check if a phone number is verified in Twilio
const isNumberVerified = async (phoneNumber) => {
    try {
        if (!phoneNumber.startsWith('+')) {
            phoneNumber = '+91' + phoneNumber;
        }
        const verifiedNumbers = await client.outgoingCallerIds.list();
        return verifiedNumbers.some(number => number.phoneNumber === phoneNumber);
    } catch (error) {
        console.error('Error checking number verification:', error);
        return false;
    }
};

const sendSMS = async (to, message) => {
    try {
        // Validate phone number format
        if (!to.startsWith('+')) {
            to = '+91' + to; // Add country code for India
        }

        // Check if number is verified (for trial accounts)
        const isVerified = await isNumberVerified(to);
        if (!isVerified) {
            throw new Error('Phone number is not verified. Please verify the number in your Twilio console first.');
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
        } else if (error.code === 21214) {
            console.error('Phone number is not verified. Please verify it in your Twilio console.');
        }
        throw error;
    }
};

module.exports = {
    sendSMS,
    isNumberVerified
}; 