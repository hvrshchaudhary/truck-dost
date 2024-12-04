const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Manufacturer = require('../models/Manufacturer');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// @route   POST api/manufacturer/register
// @desc    Register a new manufacturer
// @access  Public
router.post(
    '/register',
    [
        check('companyName', 'Company name is required').not().isEmpty(),
        check('address', 'Address is required').not().isEmpty(),
        check('mobileNumber', 'Please include a valid mobile number').isMobilePhone(),
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
        // gstNumber is optional
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { companyName, address, gstNumber, mobileNumber, password } = req.body;

        try {
            // Check if user already exists
            let manufacturer = await Manufacturer.findOne({ mobileNumber });
            if (manufacturer) {
                return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
            }
            // If gstNumber is provided, verify it
            if (gstNumber) {
                // Prepare the API request
                const options = {
                method: 'GET',
                url: 'https://appyflow.in/api/verifyGST',
                params: {
                    gstNo: gstNumber,
                    key_secret: process.env.APPYFLOW_KEY_SECRET,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                };

                // Make the API call
                const response = await axios.request(options);

                // Check the response
                if (response.data && response.data.taxpayerInfo) {
                    console.log("gstin verified");
                    console.log(response.data);
                // GST number is valid
                // Optionally, you can store additional taxpayer info
                // manufacturer.taxpayerInfo = response.data.taxpayerInfo;
                } else if (response.data && response.data.error) {
                return res.status(400).json({ errors: [{ msg: response.data.message || 'Invalid GST number' }] });
                } else {
                return res.status(400).json({ errors: [{ msg: 'Invalid GST number' }] });
                }
            }
            manufacturer = new Manufacturer({
                companyName,
                address,
                gstNumber,
                mobileNumber,
                password,
            });

            // Hash the password
            const salt = await bcrypt.genSalt(10);
            manufacturer.password = await bcrypt.hash(password, salt);

            await manufacturer.save();

            // Return JWT
            const payload = {
                user: {
                    id: manufacturer.id,
                    role: 'manufacturer',
                },
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } catch (err) {
            console.error('Error message:', err.message);
          
            if (err.response) {
              console.error('Status:', err.response.status);
              console.error('Data:', err.response.data);
          
              return res.status(err.response.status).json({
                errors: [
                  {
                    msg: err.response.data.message || 'GST number verification failed',
                  },
                ],
              });
            } else if (err.request) {
              console.error('No response received:', err.request);
          
              return res.status(500).json({
                errors: [
                  {
                    msg: 'No response from GST verification service',
                  },
                ],
              });
            } else {
              console.error('Error:', err.message);
          
              return res.status(500).json({
                errors: [
                  {
                    msg: 'Server error',
                  },
                ],
              });
            }
          }
    }
);
// @route   POST api/manufacturer/login
// @desc    Authenticate manufacturer & get token
// @access  Public
// @route   POST api/manufacturer/login
// @desc    Authenticate manufacturer & get token
// @access  Public
router.post(
    '/login',
    [
        check('mobileNumber', 'Please include a valid mobile number').isMobilePhone(),
        check('password', 'Password is required').exists(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { mobileNumber, password } = req.body;

        console.log('Login attempt for:', mobileNumber);  // Log the mobile number

        try {
            // Check if user exists
            let manufacturer = await Manufacturer.findOne({ mobileNumber });
            if (!manufacturer) {
                console.log('Manufacturer not found');  // Log if manufacturer not found
                return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
            }

            console.log('Manufacturer found:', manufacturer);  // Log manufacturer data

            // Compare passwords
            const isMatch = await bcrypt.compare(password, manufacturer.password);
            if (!isMatch) {
                console.log('Password mismatch');  // Log if passwords do not match
                return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
            }

            // Return JWT with manufacturer role
            const payload = {
                user: {
                    id: manufacturer.id,
                    role: 'manufacturer',
                },
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } catch (err) {
            console.error('Error in login attempt:', err.message);
            res.status(500).send('Server error');
        }
    }
);


const auth = require('../middleware/auth');

// @route   GET api/manufacturer/profile
// @desc    Get logged-in manufacturer's profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
    try {
        const manufacturer = await Manufacturer.findById(req.user.id).select('-password');
        res.json(manufacturer);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
module.exports = router;
