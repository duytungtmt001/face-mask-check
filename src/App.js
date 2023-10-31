import './App.css';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)


const NOT_TOUCH_LABEL = "not_touch";
const TOUCHED_LABEL = "touched";
const TRAINING_TIMES = 10;


function App() {
    const videoRef = useRef();
    const classifier = useRef();
    const mobilenetModule = useRef();
    
    
    const [typeBtn, setTypeBtn] = useState(NOT_TOUCH_LABEL);
    const [continueBtn, setContinueBtn] = useState(false);
    const [description, setDescription] = useState(1);
    const [progress, setProgress] = useState(0);
    const [hidden, setHidden] = useState(false);
    const [active, setActive] = useState(false);
    const [showNotify, setShowNotify] = useState(true);
    const descriptionList = [
        `Máy đang học... ${progress}%`,
        "Bước 1: Đeo khẩu trang và nhấn Bắt đầu để máy học nhé!",
        "Bước 2: Không đeo khẩu trang vào và nhấn Bắt đầu để máy học nhé!",
        "AI đã sẵn sàng, hãy nhấn Khởi động",
        "Nếu không đeo khẩu trang màn hình sẽ nháy đỏ nhé!"
    ]

    const hiddenBtn = hidden ? {
        display: "none"
    } : {}

    const init = async () => {
        await setupCamera();
        console.log("Setup Camera Success");

        classifier.current = knnClassifier.create();

        MySwal.showLoading();

        mobilenetModule.current = await mobilenet.load();
        MySwal.hideLoading()
        mobilenetModule.current && MySwal.fire({
            title: "AI đã sẵn sàng rùi, let's start 😊"
        })
    }

    const setupCamera = () => {
        return new Promise((resolve, reject) => {
            navigator.getUserMedia = navigator.getUserMedia || 
                navigator.webkitGetUserMedia || 
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia;
                
            if(navigator.getUserMedia) {
                navigator.getUserMedia(
                    { video: true },
                    stream => {
                        videoRef.current.srcObject = stream;
                        videoRef.current.addEventListener('loadeddata', resolve);
                    },
                    error => reject(error)
                )
            } else {
                reject();
            }
        })
    }

    const handleContinue = () => {
        if(typeBtn === NOT_TOUCH_LABEL) {
            setDescription(2)
            setTypeBtn(TOUCHED_LABEL);
        } else if(typeBtn === TOUCHED_LABEL) {
            setDescription(3)
            setTypeBtn("run");
        }
        setHidden(false);
        setContinueBtn(false);
    }

    const train = async (label) => {
        setHidden(true);
        setDescription(0);
        for(let i = 0; i < TRAINING_TIMES; ++i) {
            setProgress(parseInt((i+1) / TRAINING_TIMES *100));
            await training(label);
        }
        setContinueBtn(true);
    }

    const training = async (label) => {
        const embedding = mobilenetModule.current.infer(videoRef.current, true);

        classifier.current.addExample(embedding, label);
        await sleep(100);
    }

    const sleep = async (ms = 0) => {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    const run = async () => {
        setTypeBtn("");
        setDescription(4);
        const embedding = mobilenetModule.current.infer(videoRef.current, true);

        const result  = await classifier.current.predictClass(embedding);

        if(result.label === TOUCHED_LABEL && result.confidences[result.label] === 1) {
            setActive(true);
        } else {
            setActive(false)
        }

        await sleep(800);
        
        run();
    }

    useEffect(() => {
        init();

        // Cleanup function
        return () => {

        }
    }, [])

    return (
        <div className={`main ${active ? 'active' : ''}`}>
            <video className="video" autoPlay ref={videoRef} />

            <p className='description'>{descriptionList[description]}</p>
            <div className="control">
                {typeBtn === NOT_TOUCH_LABEL && <button style={{...hiddenBtn}} className="btn" onClick={() => train(typeBtn)}>Bắt đầu</button>}
                {typeBtn === TOUCHED_LABEL && <button style={{...hiddenBtn}} className="btn" onClick={() => train(typeBtn)}>Bắt đầu</button>}
                {continueBtn && <button className="btn" onClick={handleContinue}>Tiếp tục</button>}
                {typeBtn === "run" && <button className="btn" onClick={() => run()}>Khởi động</button>}
            </div>
        </div>
    );
}

export default App;