// Firebase Configuration & Initialization
const firebaseConfig = {
  apiKey: "AIzaSyAmcWWCnbruwSv_QFk2I60TyxYefqH4hHc",
  authDomain: "wonder-kids-school.firebaseapp.com",
  projectId: "wonder-kids-school",
  storageBucket: "wonder-kids-school.firebasestorage.app",
  messagingSenderId: "145902244646",
  appId: "1:145902244646:web:082492321059b3a079a7e7"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// 5-min disconnection fix / Auto-reconnect stabilization
db.settings({
  experimentalForceLongPolling: true
});