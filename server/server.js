const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');


const app = express();
app.use(cors());

const createDirectory = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
      console.log(`Directory created: ${directoryPath}`);
    }
};

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // const patientId = req.body.patientId;
        const uploadPath = `./uploads/`;
        // createDirectory(uploadPath); // Create the directory if it doesn't exist
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});
  
const upload = multer({ storage: storage });

app.post('/api/uploadfile', upload.single('myFile'), function(req, res, next) {
    const file = req.file;
    const participantID = req.body.participantID;
    const order = req.body.order;
    const frequency = req.body.frequency;
    const samp_frequency = req.body.samp_frequency;
    const window = req.body.window;
    const overlap = req.body.overlap;
    const movavg_fs = req.body.movavg_fs;
    console.log(req);
    if (!file) {
        const error = new Error('Please upload a file');
        error.httpStatusCode = 400;
        return next(error);
    }

    const uploadPath = `uploads/${participantID}/`;
    createDirectory(uploadPath);

    fs.rename(file.path, uploadPath + `${file.originalname}`, function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }
    });

    const pythonScriptPath = './processdata.py';
    console.log(participantID)
    const pythonProcess = spawn('/Users/test/opt/anaconda3/bin/python', [pythonScriptPath, participantID, order, frequency, samp_frequency, window, overlap, movavg_fs]);
    pythonProcess.stdout.on('data', function(data) {
        console.log(data.toString()); 
    });
    
    pythonProcess.stderr.on('data', function(data) {
        console.error(data.toString());
    });
    pythonProcess.on('exit', function(code) {
        console.log("Exited with code " + code);
    });
    pythonProcess.on('close', (code) => {
        if (code === 0) {
            const processed_file = `${path.parse(uploadPath + `${file.originalname}`).name}_movavg.csv`
            const filePath = path.join(`./${participantID}/movavg_files/`, processed_file); // Replace 'processed_file' with the actual filename
            const fileData = fs.readFileSync(filePath);
            console.log(processed_file);
            // Set the appropriate headers for the download
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename=${processed_file}`);
            // Send the file data in the response
            res.send(fileData);
        } else {
          res.status(500).send({ message: 'Error occurred during processing' });
        }
    });


    // res.send(file);
});

  
const port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log(`Server started on port ${port}`);
});