import Header from './components/Header'
import axios from 'axios';
import React,{useState, useEffect} from 'react';

function App() {  
  const [state, setState] = useState({
    // Initially, no file is selected
    selectedFile: null,
    patientId: ''
  });

  const [downloadLink, setDownloadLink] = useState('');

  useEffect(() => {
    if (downloadLink) {
      const link = document.createElement('a');
      link.href = downloadLink;
      link.download = state.selectedFile.name;
      link.click();
    }
  }, [downloadLink]);

  const onFileChange = event => {
     
    // Update the state
    setState({ selectedFile: event.target.files[0] });
   
  };
  
  // On file upload (click the upload button)
  const onFileUpload = event => {
    event.preventDefault()
    // Create an object of formData
    const formData = new FormData();
    if (!state.selectedFile) {
      window.alert('Please select a file');
      return;
    }
    if (!state.patientId) {
      window.alert('Please enter the patientId');
      return;
    }
    
    // Update the formData object
    formData.append(
      "myFile",
      state.selectedFile,
      state.selectedFile.name
    );
    formData.append("patientId", state.patientId);// Add patient ID to form data
    
    // Details of the uploaded file
    console.log(state.selectedFile);
    
    // Request made to the backend api
    // Send formData object
    // if (state.patientId) {}
    axios.post("http://localhost:3000/api/uploadfile", formData).then(res => {
      if (res.statusText < 200 || res.statusText >= 300) {
        window.alert("server error!");
      } else {
        // window.alert("file uploaded successfully");
        // Extract the filename from the response
        
        // Extract the file data and filename from the response
        const { fileData, fileName } = res.data;

        // Create a Blob from the file data
        const blob = new Blob([fileData], { type: 'text/plain' });

        // Generate a temporary URL for the Blob
        const url = URL.createObjectURL(blob);

        // Set the download link
        setDownloadLink(url);

        window.alert("file downloaded successfully");
      }
    }).catch(error => {
      console.error(error);
    });
  };
  
  // File content to be displayed after
  // file upload is complete
  const fileData = () => {
          if (state.selectedFile) {
            return (
              <div>
                <h2>File Details:</h2>
                <p>File Name: {state.selectedFile.name}</p>
                <p>File Type: {state.selectedFile.type}</p>
                <p>Patient ID: {state.patientId}</p> {/* Display patient ID */}    
              </div>
            );
          } else {
            return (
              <div>
                <br/>
                <h4>Choose before Pressing the Upload button</h4>
              </div>
            );
          }
        };
  return (
      <div className="container">
        <Header/>
        <div>
        <input className="input-file" type='file' onChange={onFileChange}/>
        <input
          type="text"
          value={state.patientId}
          onChange={(event) => setState({ ...state, patientId: event.target.value })}
          placeholder="Enter Patient ID"
        />
        </div>
        <div>
        <button onClick={onFileUpload}>
            Run Scipt!
        </button>
        </div>
          {fileData()}
      </div>
  );
}
export default App;
