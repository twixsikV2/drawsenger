import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCikO_j768HbSc-znKsdoUrfzK6jINitNU",
  authDomain: "drawsengerapi.firebaseapp.com",
  databaseURL: "https://drawsengerapi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "drawsengerapi",
  storageBucket: "drawsengerapi.firebasestorage.app",
  messagingSenderId: "874830064130",
  appId: "1:874830064130:web:82438119add8a00542d51b",
  measurementId: "G-B66SQ757X9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
