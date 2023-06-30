import { useWhisper } from '@chengsokdara/use-whisper'
import { useEffect } from 'react';

const WhisperTest = () => {
  const { transcript } = useWhisper({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // YOUR_OPEN_AI_TOKEN
    streaming: true,
    timeSlice: 1_000, // 1 second
    autoStart: true,

    whisperConfig: {
      language: 'en',
    },
  })

  let someVar = 5;


  useEffect(() => {
    console.log("constructor occurred");
    setTimeout(()=> {
        someVar=7;
        console.log("sdf");
        
    },
    2000
        )
    
    }, [someVar])

  useEffect(() => {
    (async () => {
        // // Ideal: we only send the message after interrupt detected, and only once.
        // if (!clickedButton) {
        //     return;
        // }

        if(transcript.text?.lastIndexOf("Alexa")>0) {
            console.log("hi")
        }
    
    })();
    }, [transcript]);

  return (
    <div>
        asdfasdf
      <p>{transcript.text}</p>
      <div>{someVar}</div>
    </div>
  )
}



export default WhisperTest