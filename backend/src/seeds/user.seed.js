import { config } from "dotenv";
import { connectDB } from "../lib/db.js";
import User from "../models/user.model.js";

config();

const seedUsers = [
  // Female Users
  {
    email: "ananya.verma98@gmail.com",
    fullName: "Ananya Verma",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    email: "riyasharma.work@gmail.com",
    fullName: "Riya Sharma",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/2.jpg",
  },
  {
    email: "pooja.mehta22@yahoo.com",
    fullName: "Pooja Mehta",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/3.jpg",
  },
  {
    email: "sneha.kulkarni.dev@gmail.com",
    fullName: "Sneha Kulkarni",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    email: "kritika.singh01@gmail.com",
    fullName: "Kritika Singh",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/5.jpg",
  },
  {
    email: "neha.joshi19@gmail.com",
    fullName: "Neha Joshi",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/6.jpg",
  },
  {
    email: "aditi.malhotra.office@gmail.com",
    fullName: "Aditi Malhotra",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/7.jpg",
  },

  // Male Users
  {
    email: "rahul.khanna91@gmail.com",
    fullName: "Rahul Khanna",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    email: "amangupta.cse@gmail.com",
    fullName: "Aman Gupta",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/2.jpg",
  },
  {
    email: "siddharth.jain.dev@gmail.com",
    fullName: "Siddharth Jain",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/3.jpg",
  },
  {
    email: "rohit.bansal27@yahoo.com",
    fullName: "Rohit Bansal",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/4.jpg",
  },
  {
    email: "kunal.arora.work@gmail.com",
    fullName: "Kunal Arora",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/5.jpg",
  },
  {
    email: "aditya.chauhan98@gmail.com",
    fullName: "Aditya Chauhan",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/6.jpg",
  },
  {
    email: "vikas.patel.it@gmail.com",
    fullName: "Vikas Patel",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/7.jpg",
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();
    await User.insertMany(seedUsers);
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

// Call the function
seedDatabase();
