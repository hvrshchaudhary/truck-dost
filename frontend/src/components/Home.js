import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Home = () => {
    const [message, setMessage] = useState('');

    useEffect(() => {
        axios.get('http://localhost:5000/api/data/')
            .then(response => setMessage(response.data.data))
            .catch(error => console.error(error));
    }, []);

    return (
        <div>
            <h1>Home Page</h1>
            <p>Message from backend: {message}</p>
        </div>
    );
};

export default Home;
