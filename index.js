const express = require('express')
const app = express()
var cors = require('cors')
var jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 3000
require('dotenv').config()
app.use(express.json())
app.use(cors({
  origin:["http://localhost:5174"],
  credentials:true
}))
app.use(cookieParser());

let varifyToken=(req,res,next)=>{
  // console.log("middleware running")

  let token =req.cookies?.token
  // console.log(token)





  if(!token){
    return res.status(401).send({message:"unauthorized token"})
  }


  jwt.verify(token, process.env.JWT_Secret,(err, decoded)=>{

    if(err){
      return res.status(401).send({message:"unauthorized token"})
    }

    req.user=decoded
    next()
  });
  

  

}


app.get('/', (req, res) => {
  res.send('Hello World!')
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://Hotel-booking:5Ruv3QfCoYFflRJL@cluster0.0pthw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

// // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const database = client.db("Hotel-booking");
    const roomcollection = database.collection("roomcollection");
    const mybookingcollection = database.collection("mybookingcollection");
    const reviewCollection = database.collection("reviewCollection");

    app.post("/jwt",async(req,res)=>{
      

      let userData=req.body
  
      let token= jwt.sign(userData, process.env.JWT_Secret, { expiresIn: "1h" });
  
      res
      .cookie('token', token, {
        httpOnly: true, 
        secure:false  ,    // Prevent JavaScript access to the cookie
        // secure: process.env.NODE_ENV === "production",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",         // Send cookie over HTTPS only
        
    })
      .send({success:true})
      
    });
  
    app.post("/logout",(req,res)=>{
      res
      .clearCookie('token',  {
        httpOnly: true,
        secure:false,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // Use true in production with HTTPS
      })
      .send({success:true})
    })
  
  

  


    app.get("/allRooms",async(req,res)=>{

        const cursor = roomcollection.find();
        let result=await cursor.toArray()
        res.send(result)

    })

    app.get("/roomDetails/:id",async(req,res)=>{
        let idx=req.params.id
       let query={_id:new ObjectId(idx)}
       const result = await roomcollection.findOne(query);
       
        res.send(result)

    })
    
    app.post('/bookings',async (req, res) => {
        const data = req.body;
      
        const doc = { data };
      
        const result = await mybookingcollection.insertOne(doc);
      
        // Update room availability
        const filter = { _id: new ObjectId(data.roomId) };
        const updateDoc = {
          $set: {
            availability: false,
          },
        };
        const updatedRoom = await roomcollection.findOneAndUpdate(filter, updateDoc, { returnDocument: 'after' });
      
        res.send({
          success: true,
          message: 'Booking successful',
          updatedRoom: updatedRoom.value,
        });
      });


      app.get("/mybookingPage/:email",varifyToken,async(req,res)=>{
        let email=req.params.email

        let query={"data.user.email":email}

        let cursor= mybookingcollection.find(query)
        let result= await cursor.toArray()
        res.send(result)
      })


      app.delete("/bookings/:id", async (req, res) => {
        const id = req.params.id;
      
        try {
          // Correctly convert the id to ObjectId
          const query = { _id: new ObjectId(id) };
      
          const booking = await mybookingcollection.findOne(query);
      
          if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
          }
      
          // Ensure the room ID is correctly fetched
          const roomId = booking.data.roomId;
          if (!roomId) {
            return res.status(400).json({ message: 'Room ID not found in booking.' });
          }
      
          // Update room availability
          const filter = { _id: new ObjectId(roomId) }; // Ensure correct room ID is used here
          const updateDoc = {
            $set: {
              availability: true,
            },
          };
      
          const updatedRoom = await roomcollection.findOneAndUpdate(filter, updateDoc, { returnDocument: 'after' });
      
          // Delete the booking after updating the room
          await mybookingcollection.deleteOne(query);
      
          res.status(200).json({ 
            message: 'Booking canceled and room availability updated successfully.',
            updatedRoom: updatedRoom.value,
          });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Server error.', error });
        }
      });
      app.put('/bookings/:id', async (req, res) => {
        const { id } = req.params;
        const { newDate } = req.body;
      
        
        
        let filter={_id:new ObjectId(id)}

        const updateDoc = {
            $set: {
                "data.bookingDate": newDate
            },
          };
          const result = await mybookingcollection.updateOne(filter, updateDoc);
          res.send(result)
      });


      
      
      

      app.patch('/allroom', async (req, res) => {
        const { username, rating, comment, timestamp,roomId } = req.body;
        console.log(roomId)

        let filter={_id:new ObjectId(roomId)}

        const updateDoc = {
            $push: {
                reviews: { username, rating, comment, timestamp },
              },
          };
          const result = await roomcollection.updateOne(filter, updateDoc);

          res.send(result)
      
        

        
      });
      
      
      
    



   

    
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})