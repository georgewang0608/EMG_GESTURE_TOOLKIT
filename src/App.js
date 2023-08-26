import Header from './components/Header'
import axios from 'axios';
import React,{useState} from 'react';

function App() {  
  const [state, setState] = useState({
    // Initially, no file is selected
    selectedFile: null,
    participantID: '',
    order: '',
    frequency: '',
    samp_frequency: '',
    window: '',
    overlap: '',
    movavg_fs: '',
    processingType: []
  });

  const onFileChange = event => {
     
    // Update the state
    setState({ ...state, selectedFile: event.target.files[0] });
   
  };

  // const handleProcessingTypeChange = event => {
  //   const selectedProcessingType = event.target.value;
  //   let updatedProcessingType = [...state.processingType];
  //   if (event.target.checked) {
  //     // Add the selected processing type to the array
  //     updatedProcessingType.push(selectedProcessingType);
  //   } else {
  //     // Remove the deselected processing type from the array
  //     updatedProcessingType = updatedProcessingType.filter(
  //       type => type !== selectedProcessingType
  //     );
  //   }
  //   setState({ ...state, processingType: updatedProcessingType });
  //   console.log(state.processingType);
  // };
  const handleProcessingTypeChange = event => {
    const selectedProcessingType = event.target.value;
    const isChecked = event.target.checked;
  
    setState(prevState => {
      const updatedProcessingType = isChecked
        ? [...prevState.processingType, selectedProcessingType] // Add the selected processing type to the array
        : prevState.processingType.filter(type => type !== selectedProcessingType); // Remove the deselected processing type from the array
      // console.log(state.processingType);
      return { ...prevState, processingType: updatedProcessingType };
    });
  };

  // On file upload (click the upload button)
  const onFileUpload = event => {
    // console.log(state.processingType);
    event.preventDefault()
    // Create an object of formData
    const formData = new FormData();
    if (!state.selectedFile) {
      window.alert('Please select a file');
      return;
    }
    if (!state.participantID) {
      window.alert('Please enter the participantID');
      return;
    }
    if (state.processingType[0] === `rectify` && state.processingType.length === 1) {
      if (!state.order || !state.frequency || !state.samp_frequency) {
        window.alert('Please enter the configuration for rectify');
        return;
      }
    }
    if (state.processingType[0] === `movavg` && state.processingType.length === 1) {
      if (!state.window || !state.overlap || !state.movavg_fs) {
        window.alert('Please enter the configuration for movavg');
        return;
      }
    }
    if (!state.order || !state.frequency || !state.samp_frequency || !state.window || !state.overlap || !state.movavg_fs) {
      window.alert('Please enter the configuration');
      return;
    }
    
    // Update the formData object
    formData.append(
      "myFile",
      state.selectedFile,
      state.selectedFile.name
    );
    formData.append("participantID", state.participantID);// Add patient ID to form data
    formData.append("order", state.order);
    formData.append("frequency", state.frequency );
    formData.append("samp_frequency", state.samp_frequency);
    formData.append("window", state.window);
    formData.append("overlap", state.overlap);
    formData.append("movavg_fs", state.movavg_fs);
    
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
        // Create a Blob from the response data
        const blob = new Blob([res.data], { type: 'application/zip' });

        // Generate a temporary URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a download link
        const link = document.createElement('a');
        link.href = url;
        const fileName = state.selectedFile.name.split('.')[0];
        link.download = `${fileName}_movavg.zip`;
        link.click();

        // Clean up the temporary URL
        URL.revokeObjectURL(url);

        window.alert("file downloaded successfully");
      }
    }).catch(error => {
      if (error.response) {
        // Request was made and server responded with a non-2xx status code
        console.error('Server Error:', error.response.data);
        // Display the error message to the user
        window.alert('Server Error: ' + error.response.data.message);
      }
      // console.error(error);
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
          <p>participant ID: {state.participantID}</p> {/* Display patient ID */}
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

  const renderRectifyInputs = () => {
    const { order, frequency, samp_frequency } = state;
    return (
      <>
      <p>Rectify</p>
        <input
          type="number"
          value={order}
          onChange={event => setState({ ...state, order: (Math.max(0, event.target.value)===0)?'':event.target.value })}
          placeholder="Enter filter order"
        />
        <input
          type="number"
          value={frequency}
          onChange={event => setState({ ...state, frequency: (Math.max(0, event.target.value)===0)?'':event.target.value })}
          placeholder="Enter frequency"
        />
        <input
          type="number"
          value={samp_frequency}
          onChange={event => setState({ ...state, samp_frequency: (Math.max(0, event.target.value)===0)?'':event.target.value })}
          placeholder="Enter sampling frequency"
        />
      </>
    );
  };
  
  const renderMovavgInputs = () => {
    const { window, overlap, movavg_fs } = state;
    return (
      <>
        <p>Movavg</p>
        <input
          type="number"
          value={window}
          onChange={event => setState({ ...state, window: (Math.max(0, event.target.value)===0)?'':event.target.value })}
          placeholder="Enter window"
        />
        <input
          type="number"
          value={overlap}
          onChange={(event) => {
            let value = event.target.value;
            value = Math.min(1, Number(value));
            value = Math.max(0, value)
            setState({ ...state, overlap: (value===0)?'':value});
        }}            
        placeholder="Enter overlap"
        />
        <input
          type="number"
          value={movavg_fs}
          onChange={event => setState({ ...state, movavg_fs: (Math.max(0, event.target.value)===0)?'':event.target.value })}
          placeholder="Enter movavg frequency"
        />
      </>
    );
  };
      
  return (
    <div className="container">
      <Header />
      <div>
        <input className="input-file" type="file" onChange={onFileChange} />
        <input
          type="text"
          value={state.participantID}
          onChange={event => setState({ ...state, participantID: event.target.value })}
          placeholder="Enter Participant ID"
        />
      </div>
      <div>
        <h3>Configure signal processing</h3>
        <div>
          <label>
            <input
              type="checkbox"
              name="rectify"
              value="rectify"
              checked={state.processingType.includes('rectify')}
              onChange={handleProcessingTypeChange}
            />
            Rectify
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              name="movavg"
              value="movavg"
              checked={state.processingType.includes('movavg')}
              onChange={handleProcessingTypeChange}
            />
            Movavg
          </label>
        </div>
        {state.processingType.includes('rectify') && renderRectifyInputs()}
        {state.processingType.includes('movavg') && renderMovavgInputs()}
      </div>
      <div>
        <button onClick={onFileUpload}>Run Script</button>
      </div>
      {fileData()}
    </div>
  );
}
export default App;
