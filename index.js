const express = require('express')
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yitxt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yitxt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yitxt.mongodb.net/tourismDb?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const PackageCollection = client.db('tourismDb').collection('package');
    const userCollection = client.db('tourismDb').collection('users');
    const tourGuideCollection = client.db('tourismDb').collection('tourGuides');
    const storyCollection = client.db('tourismDb').collection('stories');
    const bookingCollection = client.db('tourismDb').collection('bookings');
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    // jwt related api
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'})
      res.send({token});
    })

    //middleware
    const verifyToken =(req,res,next)=>{
      console.log("inside verify token", req.headers.authorization);
      
      if(!req.headers.authorization){
        return res.status(401).send({message: "forbidden access"})
      }
    
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
    
        if(err){
          return res.status(401).send({message: 'forbidden access'})
         
        }
        req.decoded =  decoded;
        next();
      })
      
    }


    // user related api

    app.get('/users', async (req,res)=>{
  
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // app.get('/users/admin/:email', async(req,res)=>{
    //   const email = req.params.email;
    //   if(email !== req.decoded.email){
    //     return res.status(403).send({message: 'unauthorized access'})
    //   }
    //   const query = { email: email};
    //   const user = await userCollection.findOne(query);
    //   let admin = false;
    //   if(user){ 
    //     admin = user?.role === 'admin'
    //   }
    //   res.send({admin});
    // })



    app.get('/users/roles/:email', async (req, res) => {
      try {
          const email = req.params.email;
  
          // Find user in userCollection
          const user = await userCollection.findOne({ email });
  
          // Find user in tourGuideCollection
          const tourGuide = await tourGuideCollection.findOne({ email });
  
          // Determine roles
          const roles = {
              admin: user?.role === 'admin',  // True if user is admin
              tourGuide: !!tourGuide          // True if user exists in tourGuideCollection
          };
  
          res.send(roles);
      } catch (error) {
          console.error("Error fetching user roles:", error);
          res.status(500).send({ message: "Internal Server Error" });
      }
  });
  
  


  app.get("/users/:email", async (req, res) => {
    const email = req.params.email;
    const user = await userCollection.findOne({ email }) || { role: "user" };
    res.send(user);
  });

    app.post('/users', async(req,res)=>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: "user already exist"})
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const { name, image } = req.body;
      const result =await userCollection.updateOne({ email }, { $set: { name, image } });
      res.send(result)
    });


    app.delete('/users/:id', async (req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })
    
    app.patch('/users/admin/:id', async (req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set : {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

   
    
   
    



    // package api
    app.get('/package', async(req,res)=>{
      const result = await PackageCollection.find().toArray();
      res.send(result)
  })

  app.get('/randomPackages', async (req, res) => {
    const result = await PackageCollection.aggregate([{ $sample: { size: 3 } }]).toArray();
    res.send(result);
  });

  app.get("/packageDetails/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await PackageCollection.findOne(query);
    res.send(result);
  });

  app.post('/package',async(req,res)=>{
    const item =req.body;
    const result = await PackageCollection.insertOne(item);
    res.send(result);
   
  })

  // tourGuide api

  app.get('/tourGuideApply', async(req,res)=>{
    const result = await tourGuideCollection.find().toArray();
    res.send(result)
})

app.get('/tourGuides', async (req, res) => {
  const result = await tourGuideCollection.find({ role: "tourGuide" }).toArray();
  res.send(result);
});

app.get("/tourGuides/:email", async (req, res) => {
  const email = req.params.email;
  const user = await tourGuideCollection.findOne({ email }) || { role: "user" };
  res.send(user);
});

app.get("/tourGuide/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await tourGuideCollection.findOne(query);
  res.send(result);
});

app.put("/tourGuides/:email", async (req, res) => {
  const email = req.params.email;
  const { name, image } = req.body;
  const result =await tourGuideCollection.updateOne({ email }, { $set: { name, image } });
  res.send(result)
});


app.post('/tourGuideApply',async(req,res)=>{
  const item =req.body;
  const result = await tourGuideCollection.insertOne(item);
  res.send(result);
 
})


// app.get('/users/tourGuides/:email', async(req,res)=>{
//   const email = req.params.email;
//   if(email !== req.decoded.email){
//     return res.status(403).send({message: 'unauthorized access'})
//   }
//   const query = { email: email};
//   const user = await tourGuideCollection.findOne(query);
//   let admin = false;
//   if(tourGuide){ 
//     tour_guide = tourGuide?.role === 'tourGuide'
//   }
//   res.send({admin});
// })

app.delete('/tourGuides/:id', async (req,res)=>{
  const id = req.params.id;
  const query = { _id: new ObjectId(id)}
  const result = await tourGuideCollection.deleteOne(query);
  res.send(result);
})

app.patch('/users/tourGuides/:id', async (req,res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updatedDoc = {
    $set : {
      role: 'tourGuide'
    }
  }
  const result = await tourGuideCollection.updateOne(filter, updatedDoc)
  res.send(result)
})


// user story related api

app.get('/stories', async(req,res)=>{
  const result = await storyCollection.find().toArray();
  res.send(result)
})

app.get("/stories/:email", async (req, res) => {
  const email = req.params.email;
  try {
      const stories = await storyCollection.find({ email }).toArray();
      res.send(stories);
  } catch (error) {
      res.status(500).send({ error: "Failed to fetch stories" });
  }
});

app.get('/randomStories', async (req, res) => {
  const result = await storyCollection.aggregate([{ $sample: { size: 4 } }]).toArray();
  res.send(result);
});

app.post('/stories',async(req,res)=>{
  const item =req.body;
  const result = await storyCollection.insertOne(item);
  res.send(result);
 
})

app.put("/stories/:id", async (req, res) => {
  const { id } = req.params;
  const { story, image } = req.body; // Extract updated fields

  try {
      const result = await storyCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { story, image } } // Update fields
      );
      res.send(result);
  } catch (error) {
      res.status(500).send({ error: "Failed to update story" });
  }
});


app.delete("/stories/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  try {
      const result = await storyCollection.deleteOne(filter);
      res.send(result);
  } catch (error) {
      res.status(500).send({ error: "Failed to delete story" });
  }
});



//bookings related api 
app.get('/bookings', async(req,res)=>{
  const result = await bookingCollection.find().toArray();
  res.send(result)
})


app.get("/booking", async (req, res) => {
  try {
    const { tourGuideEmail } = req.query;
    if (!tourGuideEmail) return res.status(400).json({ error: "Missing tourGuideEmail" });

    const bookings = await bookingCollection.find({ tourGuideEmail }).toArray();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});


app.patch("/booking/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const result = await bookingCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ message: "Booking updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update booking" });
  }
});

app.get("/bookings/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const bookings = await bookingCollection.find({ touristEmail: email }).toArray();
    res.send(bookings);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch bookings" });
  }
});

app.post('/bookings',async(req,res)=>{
  const item =req.body;
  const result = await bookingCollection.insertOne(item);
  res.send(result);
 
})

app.delete("/bookings/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const booking = await bookingCollection.findOne({ _id: new ObjectId(id) });

    if (booking?.status !== "Pending") {
      return res.status(400).send({ error: "Cannot delete a confirmed booking" });
    }

    await bookingCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ message: "Booking cancelled" });
  } catch (error) {
    res.status(500).send({ error: "Failed to cancel booking" });
  }
});









  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send("tourism is running me")
})

app.listen(port, ()=>{
    console.log("Tourism")
})