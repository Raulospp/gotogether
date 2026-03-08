import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("Connetion succesfull!");
    } catch(error) { 
        console.log(error)
    }
}

export default connectDB