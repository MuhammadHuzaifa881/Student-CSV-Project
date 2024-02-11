const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const cors = require('cors');
const { Readable } = require('stream');
const admin = require('firebase-admin');

const serviceAccount = require('./key/zysoftec-dashboard-firebase-adminsdk-jefu4-bdb34b11fb.json'); // Replace with your service account key

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://zysoftec-dashboard-default-rtdb.firebaseio.com/', // Replace with your Firebase project URL
});

// Multer configuration to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });




// post data to database 
app.post('/upload', upload.single('csvFile'), async (req, res) => {
  // Check if a file is provided
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Convert the buffer to a string
  const csvString = req.file.buffer.toString('utf8');

  // Create a readable stream from the CSV string
  const stream = Readable.from(csvString);

  // Parse the CSV using csv-parser
  const results = [];
  // const cleanHeaders = (header) => header.replace(/^\d+_/, ''); // Remove leading numbers and underscores

  stream
    .pipe(csv(['id', 'first_name','last_name','date_of_birth','gender','status','entry_academic_period','hs_gpa','hs_city','hs_state','email','entry_age','ged']))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      const db = admin.database();
      const ref = db.ref('student');

      try {
        results.shift();
        var dict = {}
        results.forEach((el) => dict[el.id] = el);
        await ref.set(dict);
        console.log('Data stored in Firebase Realtime Database');
        res.status(200).json({ message: 'CSV file uploaded and processed successfully.' });
      } catch (error) {
        console.error('Error storing data in Firebase:', error);
        res.status(500).json({ error: 'Internal server error.' });
      }
    });
});


// get data from datbase 
app.get('/getData', async (req, res) => {
  try {
    const db = admin.database();
    const ref = db.ref('student'); // Replace with the correct path to your data

    const snapshot = await ref.once('value');
    const data = snapshot.val();
    res.status(200).json({ data });
  } catch (error) {
    console.error('Error retrieving data from Firebase:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// delete from database
// Server-side code (Express)
app.delete('/deleteRow/:id', (req, res) => {
  const idToDelete = req.params.id;
  const db = admin.database();
  const ref = db.ref('student');
  // Find the reference to the student with the given ID
  const studentRefToDelete = ref.child(idToDelete);
  studentRefToDelete.remove()
    .then(() => {
      res.status(200).json({ message: 'Row deleted successfully.' });
    })
    .catch((error) => {
      res.status(404).json({ message: 'Row not found.', error: error.message });
    });
});
// Update data route
// Update route
app.post('/updateData/:id',async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;
console.log(id,updatedData);
    if (typeof updatedData !== 'object') {
      throw new Error('Updated data must be an object.');
    }

    const databaseRef = admin.database().ref(`student`).child(id); // Change 'students' to your actual database path

    databaseRef.update(updatedData, (error) => {
      if (error) {
        console.error('Error updating data in Firebase Realtime Database:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      } else {
        databaseRef.set(updatedData)
        // firebase.database().ref('students' + id_user + '/add_balance').set('NEWVALUE');
        console.log(`Data with ID ${id} updated successfully.`);
        res.json({ success: true, message: 'Data updated successfully' });
      }
    });
  } catch (error) {
    console.error('Error in updateData route:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});





app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
