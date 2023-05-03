from globals import *

biosig_names = ["EMG","IMU","LeapLeft","LeapRight","RGBcamera","SynchData"]

def rectify_EMG(data, N=4, Wn=40, fs=2000):
    # 0. demean EMG data
    data = data - np.mean(data)
    
    # 1. high-pass filter @ 40 hz, 4th order butterworth
    sos_high = signal.butter(N,Wn,btype='high',fs=fs,output='sos')
    hp_filtered = signal.sosfilt(sos_high,data)
    
    # 2. rectify
    rectified = abs(hp_filtered)
    
    # 3. low-pass filter @ 40 Hz, 4th order butterworth
    sos_low = signal.butter(N,Wn,btype='low',fs=fs,output='sos')
    lp_filtered = signal.sosfilt(sos_low,rectified)
    return lp_filtered

def movavg_EMG(data,window=100,overlap=0.5,fs=2000):
    # 200 ms window, overlap = 0 is no overlap, overlap=1 is complete overlap 
    N = int(1*window/1000*fs) # number of datapoints in one window
    N_overlap = int(N*overlap)
    
    movavg_data = []
    
    ix = N
    while ix < len(data):
        movavg_data.append(np.mean(data[ix-N:ix]))
        ix = ix + (N - N_overlap)
    
    return np.asarray(movavg_data)

def ignore_repeated_files(files):
    files_no_repeats = []
    count = 0
    double_flag = False
    while count < len(files)-1:
        fileNum1 = files[count].split("_")[5]#.split(".")[0]
        fileNum2 = files[count+1].split("_")[5]#.split(".")[0]
        if (fileNum1==fileNum2):
            if files[count].split("_")[2] == files[count+1].split("_")[2]:
                files_no_repeats.append(files[count+1])
                count += 2
                double_flag = True
            else:
                files_no_repeats.append(files[count])
                count +=1
                double_flag = False
        else:
            files_no_repeats.append(files[count])
            count +=1
            double_flag = False
    if double_flag == False:
        files_no_repeats.append(files[-1])
    return files_no_repeats

def read_and_save_cleaned_data(participantID="P101",n_interpolate=100,bound_size=1e-3):#,df_EMG_exptr_def,df_EMG_usr_def,df_EMG_calib,df_EMG_rehab):
    path = global_path + participantID+"/"
    save_path = temp_path + participantID + "/"
    # print(save_path)
    # path = global_path + participantID
    # save_path = temp_path
    files = os.listdir(path)
    # print(files)
    # why 
    files = copy.deepcopy(files)
    print(files)
    EMG_files = []
    IMU_files = []
    LeapLeft_files = []
    LeapRight_files = []
    RGBcamera_files = []
    SynchData_files = []

    for file in files:
        if len(file.split("_")) < 4:
            continue
        biosig_type = file.split("_")[3]
        print(biosig_type)
        expt_type = file.split("_")[2] # "experimenter-defined, user-defined, calibration, rehab"  
        if biosig_type=="EMG" and expt_type != "calibration":
            EMG_files.append(file)
            print(EMG_files)
        elif biosig_type=="LeapRight" and expt_type != "calibration":
            LeapRight_files.append(file)
        elif biosig_type=="IMU" and expt_type != "calibration":
            IMU_files.append(file)

    # there should be 100 files for experimenter defined, 50 files for user-defined, 1-50 file for calibration, and 31 files for rehab 
    iN = 0
    while len(EMG_files) > 100+50+31: # for people who didn't do hand trials
        EMG_files = ignore_repeated_files(EMG_files)
        iN += 1
        if iN > 100+50+31:
            print('the number of EMG files is: ',len(EMG_files), "and it should be: ", str(100+50+31))
            break
        
    for ix,file in enumerate(EMG_files):
        split_filename = file.split("_")
        expt_type = split_filename[2] # "experimenter-defined, user-defined, calibration, rehab" 
        gestureID = split_filename[4]
        gestureNum = split_filename[5].split(".")[0]
            # define for user-def, calib, and rehab too
        if expt_type == "calibration":
            continue
        else:
        
            df_EMG = pd.read_csv(path+file,sep="\t",names=['EMG1','EMG2','EMG3','EMG4','EMG5',
                                                           'EMG6','EMG7','EMG8','EMG9','EMG10',
                                                           'EMG11','EMG12','EMG13','EMG14','EMG15',
                                                           'EMG16'],header=None)

            # check if EMG activity is doubled
            if df_EMG["EMG2"].values[2]==df_EMG["EMG2"].values[3]:
                df_EMG = df_EMG.iloc[::2, :] # participant has redundant EMG activity

            # filter raw EMG signals
            df_EMG_filt = df_EMG.apply(rectify_EMG,axis=0)
            time_EMG = np.linspace(0,len(df_EMG)/2000,len(df_EMG)) # TODO CHECK TO SEE IF EMG IS 2000 Hz 

            # compute moving average time x 16 channels
            df_EMG_movavg = df_EMG_filt.apply(movavg_EMG,axis=0)
            # save moving average as csv files
            if not os.path.isdir(temp_path + participantID):
                os.mkdir(temp_path + participantID)
            if not os.path.isdir(save_path+'movavg_files'):
                os.mkdir(save_path+'movavg_files')
            df_EMG_movavg.to_csv(save_path+'movavg_files/' + file[:-4] + "_movavg.csv")
            # # PCA time x num_pca_components
            # pca = PCA()
            # df_EMG_pca = pd.DataFrame(pca.fit_transform(df_EMG_movavg)) # time x num_pca_components

            # # save filtered and cleaned EMG data as csv files 
            # if not os.path.isdir(save_path+'pca_files'):
            #     os.mkdir(save_path+'pca_files')
            # df_EMG_pca.to_csv(save_path+'pca_files/' + file[:-4] + "_pca.csv")

# for pID in pIDs:
#     print('running ',pID)
#     read_and_save_cleaned_data(pID)#,df_EMG_exptr_def,df_EMG_usr_def,df_EMG_calib,df_EMG_rehab)
# Check if the patient ID is provided as a command-line argument
if len(sys.argv) < 2:
    print("Please provide the patient ID as a command-line argument.")
    sys.exit(1)

patientId = sys.argv[1]
read_and_save_cleaned_data(patientId)
sys.exit(0)