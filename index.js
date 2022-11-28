const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bkf4wz6.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
//verifyJWT
function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run(){
    try{
        const productCollections = client.db('cMart').collection('productsCollection');
        const categoryCollections = client.db('cMart').collection('CategoryCollections');
        const usersCollections = client.db('cMart').collection('users');
        const bookingsCollection = client.db('cMart').collection('bookings');

        //allcategory
        app.get('/category', async(req,res)=>{
            const query={};
            const cursor = categoryCollections.find(query);
            const result = await cursor.toArray();
            res.send(result)
        });

        //category_id
        app.get('/category/:id', async(req,res)=>{
            const id = req.params.id;
            const query ={_id:ObjectId(id)};
            const product = await productCollections.findOne(query);
            res.send(product);
        })
        
        //allProduct
        app.get('/allProduct', async(req,res)=>{
            const query={};
            const cursor = productCollections.find(query);
            const result = await cursor.toArray();
            res.send(result)
        });
  
        app.get('/allProduct/:id', async(req,res)=>{
            const id =req.params.id;
            const query ={categoryId:(id)}
            const result= await productCollections.find(query).toArray();
            res.send(result);
        })

        

        //booking

        //get booking

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        })


        //post bookings
        app.post('/bookings', async(req,res)=>{
            const booking = req.body;
            console.log(booking);
            const query ={
                title:booking.title
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length){
                const message = `You already have a booking on ${booking.title}`
                return res.send({acknowledged: false, message})
            }
            const result=await bookingsCollection.insertOne(booking);
            res.send(result)
        })


        //users
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '5h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollections.find(query).toArray();
            res.send(users);
        });

        //admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })


        
        
        app.post('/users',async(req,res)=>{
           const user = req.body;
          const result = await usersCollections.insertOne(user);
          res.send(result);
        })

        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

    }

    finally{

    }
}
run().catch(console.log);


app.get('/', async(req,res)=>{
    res.send('Cmart server is running');
})
app.listen(port, ()=>console.log(`Cmart server is running on: ${port}`));