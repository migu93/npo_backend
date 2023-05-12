const express = require('express');
const mongoose = require('mongoose');
const Vacancy = require('./vacancy'); // adjust the path as needed
const bcrypt = require('bcrypt');
const User = require('./user');
const { expressjwt: jwt, expressjwt} = require("express-jwt");
const secretKey = 'kool'


// Create an Express application
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb+srv://migu93:EneOEztnO334d@cluster0.hgueytq.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Successfully connected to the database'))
    .catch(error => console.error('An error occurred while trying to connect to the database', error));

// Middleware to parse JSON bodies
app.use(express.json());

// Start the server
const port = 3000; // or whatever port you want to use
app.listen(port, () => console.log(`Server is listening on port ${port}`));

app.get('/vacancies', async (req, res) => {
    try {
        const vacancies = await Vacancy.find();
        res.json(vacancies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/vacancies', expressjwt({ secret: secretKey, algorithms: ['HS256'] }), async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const vacancy = new Vacancy({
        title: req.body.title,
        description: req.body.description,
        requirements: req.body.requirements,
        responsibilities: req.body.responsibilities,
        salary: req.body.salary,
    });

    try {
        const newVacancy = await vacancy.save();
        res.status(201).json(newVacancy);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/vacancies/:id', getVacancy, (req, res) => {
    res.json(res.vacancy);
});

async function getVacancy(req, res, next) {
    let vacancy;
    try {
        vacancy = await Vacancy.findById(req.params.id);
        if (vacancy == null) {
            return res.status(404).json({ message: 'Cannot find vacancy' });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }

    res.vacancy = vacancy;
    next();
}

app.put('/vacancies/:id', expressjwt({ secret: secretKey, algorithms: ['HS256'] }), getVacancy, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    res.vacancy.title = req.body.title;
    res.vacancy.description = req.body.description;
    res.vacancy.requirements = req.body.requirements;
    res.vacancy.responsibilities = req.body.responsibilities;
    res.vacancy.salary = req.body.salary;

    try {
        const updatedVacancy = await res.vacancy.save();
        res.json(updatedVacancy);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


app.delete('/vacancies/:id', expressjwt({ secret: secretKey, algorithms: ['HS256'] }), getVacancy, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        await res.vacancy.remove();
        res.json({ message: 'Deleted Vacancy' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user._id, isAdmin: user.isAdmin }, secretKey);
    res.json({ token });
});

app.post('/register', async (req, res) => {
    const { username, password, isAdmin } = req.body;

    // Check if user already exists
    let user = await User.findOne({ username });
    if (user) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
        username,
        password: hashedPassword,
        isAdmin: isAdmin || false
    });

    try {
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


