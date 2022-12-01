const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const knex = require('knex');

const saltRounds = 10;
const db = knex({
    client: 'pg',
    connection: {
        host: 'YOUR HOST',
        port: 5432,
        user: 'YOUR USER',
        password: 'YOUR PASSWORD',
        database: 'YOUR DB'
    }
});

const app = express();
app.use(express.json());
app.use(cors());

// SIGN IN user

app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            if (isValid) {
                return db.select('*').from('users')
                    .where('email', '=', req.body.email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(() => res.status(400).json('Unable to get user'))
            } else {
                res.status(400).json('Wrong credentials');
            }
        }).catch(() => res.status(400).json('Wrong credentials'))
});

// REGISTER user

app.post('/register', (req, res) => {
    const {email, name, password} = req.body;
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(password, salt);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0].email,
                        name: name,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0]);
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
    }).catch(err => res.status(400).json('Unable to register'));
})

// GET user

app.get('/profile/:id', (req, res) => {
    const {id} = req.params;
    db.select('*').from('users').where('id', id).then(user => {
        if (user.length) {
            res.json(user[0])
        } else {
            res.status(400).json('Not found');
        }
    }).catch(err => res.status(400).json('Error getting user'));
})

// PUT image

app.put('/image', (req, res) => {
    const {id} = req.body;
    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0].entries);
        }).catch(err => res.status(400).json('Unable to get entries'))
})


app.listen(3000, () => {
    console.log('app is running on port 3000');
});