<!-- MusicPlayer.svelte -->
<script lang="ts" module >
import { musicRecording } from "$lib/RecordingActions"
  export interface MusicInfo {
    name: string;
    size: number;
    duration: number;
    url: string;
    type: string;
  }
  let isPlaying =$state( false);
  let audioElement: HTMLAudioElement;
  let currentMusic: MusicInfo | null =$state( null);
  export const togglePlay = () => { 
    musicRecording.audioElement = audioElement
    if (!audioElement || !currentMusic) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play().catch((err) => {
        console.log('播放失败: ' + err.message);
      });
    }
  };
</script>
<script lang="ts" >


  //import { onDestroy,onMount } from 'svelte';
  const {playStatus}:{playStatus:(playing:boolean )=>void} = $props()
  let source: MediaElementAudioSourceNode = null
  let ctx: CanvasRenderingContext2D
  let ctxp: CanvasRenderingContext2D
  let audioContext: AudioContext = null
  let analyser: AnalyserNode
  let canvas:HTMLCanvasElement;
  let canvasp:HTMLCanvasElement;


  let currentTime =$state( 0);
  let duration = $state(0);
  let volume = $state(0.8);
  let progress = $state(0);
  let isLoading = $state(false);
  let errorMessage = $state('');
  function visualizeWaveform(dataArray:Uint8Array<ArrayBuffer>,canvas: HTMLCanvasElement) {
    //const canvas = document.getElementById('waveformCanvas');
    const bufferLength = dataArray.length
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 255, 0)';
    ctx.beginPath();
    
    const sliceWidth = width * 1.0 / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      // Convert byte value (0-255) to vertical position
      const v = dataArray[i] / 128.0; // 0-255 becomes 0-2
      const y = v * height / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  } 
  const startMusic = ()=>{
    //const canvas = document.getElementById('myCanvas');
    if (!audioContext){
      ctx = canvas.getContext('2d');
      ctxp = canvasp.getContext('2d');
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 32; 
    
      source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);  
    }
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const pdataArray = new Uint8Array(analyser.frequencyBinCount);
    //const energyHistory = []
    
    const sumArray = [...Array(analyser.frequencyBinCount)].map(v=>0)
    const esumArray = [...Array(analyser.frequencyBinCount)].map(v=>0)
    //const instant = new Array(analyser.frequencyBinCount) 
    const bufferArray:{dataArray:Uint8Array<ArrayBuffer>,time:number,normalized:number[]}[] = []
    const MaxTime = 5000
    let isOut = false
    //let n = 1
    let lastBeatTime =performance.now();
    //const lastStart = {f:false,time:lastBeatTime}
    console.log(analyser.frequencyBinCount)
    function update(time:number) {
      if (!isPlaying){
        //audioElement.
        
        //analyser.disconnect()
        //source.disconnect()
        //audioContext.close()
        console.log("end")
        return
      }
        requestAnimationFrame((t)=>{
          update(t)
        });
        
        analyser.getByteFrequencyData(dataArray); // 获取当前时刻的频率数据
        analyser.getByteTimeDomainData(pdataArray)
        const bufferLength = analyser.frequencyBinCount
        //console.log(dataArray.length,bufferLength)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) -1;
        visualizeWaveform(pdataArray,canvasp)

        let x = 0;  

        const buf = {dataArray,time,normalized:[...Array(analyser.frequencyBinCount)].map(v=>0)}
        bufferArray.push(buf)
        const sendmsgDB:{i:number,d:number,tmp:number}[] =  []
        for (let i = 0; i < bufferLength; i++) { 

          sumArray[i] += dataArray[i] ; 
          const e = sumArray[i]/ (bufferArray.length)
          let normalized = (dataArray[i]-e) 
          
          const barHeight = (normalized/255) * canvas.height/2;          
          ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
          ctx.fillRect(x, canvas.height/2 - barHeight, barWidth, barHeight);
          
        
          
          x += barWidth + 1;  


          const bakNor = normalized
          normalized = Math.abs(normalized)
          esumArray[i]+=normalized
          buf.normalized[i] = normalized
          const en =  esumArray[i]/(bufferArray.length)

          if ( normalized> en) {   
            sendmsgDB.push({i,d:normalized  ,tmp:esumArray[i]}) 
          }
          
        }
        if (isOut && sendmsgDB.length>0){
          //sendmsg({time,db:sendmsgDB})
        }

        
        if (isOut || time-lastBeatTime > MaxTime){
          if (!isOut){isOut = true}
          const buf_ = bufferArray.shift()
          buf_.dataArray.forEach((v,i)=>{
            sumArray[i]-=v
            
          })
          buf_.normalized.forEach((v,i)=>{
            esumArray[i] -=v
          })
           

        } 
 
    }
   
    update(lastBeatTime);
   
   
  }




  // 状态

  
  // 文件上传处理
  const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // 检查文件类型
    if (!file.type.startsWith('audio/')) {
      //errorMessage = '请选择音频文件';
      if (file.type.startsWith('text/')){
        const reader = new FileReader();
        reader.onload = function(e) {
          const content = e.target.result;
          //document.getElementById('content').textContent = content;
          musicRecording.RecordingValue = JSON.parse(content as string)
          //console.log('文件内容:', content);
        };
        reader.onerror = function(e) {
          console.error('读取文件出错:', e.target.error);
        };
        
        reader.readAsText(file, 'UTF-8');
      }
      return;
    }
    
    // 创建文件URL
    const url = URL.createObjectURL(file);
     
    // 创建音频元素分析时长
    const tempAudio = new Audio(url);
    
    tempAudio.onloadedmetadata = () => {
      currentMusic = {
        name: file.name,
        size: file.size,
        duration: tempAudio.duration,
        url: url,
        type: file.type
      };
      console.log(currentMusic)
      // 设置音频源
      if (audioElement) {
        audioElement.src = url;
        duration = tempAudio.duration;
        currentTime = 0;
        progress = 0;
      }
      
      // 清理临时音频
      tempAudio.remove();
      errorMessage = '';
    };
    
    tempAudio.onerror = () => {
      errorMessage = '无法加载音频文件';
      console.log(errorMessage)
      URL.revokeObjectURL(url);
    };
    
    isLoading = true;
    tempAudio.load();
  };
 

  // 时间更新处理
  const handleTimeUpdate = () => {
    if (!audioElement) return;
    
    currentTime = audioElement.currentTime;
    duration = audioElement.duration || 0;
    
    if (duration > 0) {
      progress = (currentTime / duration) * 100;
    }
  };

  // 进度条控制
  const handleProgressChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    
    if (audioElement && duration > 0) {
      audioElement.currentTime = (value / 100) * duration;
      progress = value;
    }
  };

  // 音量控制
  const handleVolumeChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    volume = parseFloat(target.value)/100;
    //console.log(volume,volume/100)
    if (audioElement) {
      audioElement.volume = volume ;
    }
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 清理URL
  /*
  onDestroy(() => {
    if (currentMusic && currentMusic?.url) {
      URL.revokeObjectURL(currentMusic.url);
    }
  });
  */
</script>

<div class="music-player">
  <!-- 文件上传区域 -->
  <div class="upload-section">
    <label class="upload-area">
      <input
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.txt"
        onchange={(e)=>{
          //console.log(e)
          handleFileUpload(e)
          }}
        class="file-input"
      />
      <div class="upload-content">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p>点击或拖放音频文件到此处</p>
        <small>支持 MP3, WAV, OGG, FLAC, AAC, M4A 格式</small>
      </div>
    </label>
  </div>

  <!-- 错误提示 -->
  {#if errorMessage}
    <div class="error-message">
      {errorMessage}
    </div>
  {/if}

  <!-- 播放器界面 -->
  {#if currentMusic}
    <div class="player-section">
      <!-- 音乐信息 -->
      <div class="music-info">
        <h3>{currentMusic.name}</h3>
        <div class="music-details">
          <span>时长: {formatTime(currentMusic.duration)}</span>
          <span>大小: {formatFileSize(currentMusic.size)}</span>
          <span>格式: {currentMusic.type.split('/')[1].toUpperCase()}</span>
        </div>
      </div>

      <!-- 音频控制 -->
      <div class="audio-controls">
        <button 
          class="play-button {isPlaying ? 'playing' : ''}"
          onclick={togglePlay}
          disabled={!currentMusic}
        >
          {isPlaying ? '暂停' : '播放'}
        </button>
        
        <div class="progress-section">
          <span class="time-current">{formatTime(currentTime)}</span>
          <input
            type="range"
            class="progress-bar"
            value={progress}
            max="100"
            step="0.1"
            oninput={handleProgressChange}
          />
          <span class="time-total">{formatTime(duration)}</span>
        </div>

        <div class="volume-control">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <input
            type="range"
            class="volume-slider"
            value={volume * 100}
            max="100"
            oninput={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  {/if}

  <!-- 隐藏的音频元素 -->
  <audio
    bind:this={audioElement}
    ontimeupdate={handleTimeUpdate}
    onplay={() => {
      isPlaying = true
      
      playStatus(isPlaying )
      //startMusic()
      }
    }
    onpause={(e) => {
      isPlaying = false
      //console.log(e)
      
      playStatus(isPlaying )
    }}
    onended={() => {
      isPlaying = false
      playStatus(isPlaying )
    }}
    onloadeddata={() => isLoading = false}
    onerror={() => errorMessage = '音频加载失败'}
    volume={volume}
  ></audio>

  <canvas bind:this={canvas} width="400" height="100"></canvas>
  <canvas bind:this={canvasp} width="400" height="100"></canvas>
</div>

<style>
  .music-player {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .upload-section {
    margin-bottom: 30px;
  }

  .upload-area {
    display: block;
    border: 2px dashed #ccc;
    border-radius: 12px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #f8f9fa;
  }

  .upload-area:hover {
    border-color: #007bff;
    background: #e7f3ff;
  }

  .file-input {
    display: none;
  }

  .upload-content svg {
    color: #6c757d;
    margin-bottom: 15px;
  }

  .upload-content p {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #333;
  }

  .upload-content small {
    color: #6c757d;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 12px;
    border-radius: 8px;
    margin: 15px 0;
    text-align: center;
  }

  .player-section {
    background: white;
    border-radius: 12px;
    padding: 25px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .music-info h3 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .music-details {
    display: flex;
    gap: 20px;
    color: #666;
    font-size: 14px;
    margin-bottom: 25px;
    flex-wrap: wrap;
  }

  .audio-controls {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .play-button {
    background: #007bff;
    color: white;
    border: none;
    border-radius: 25px;
    padding: 12px 30px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    align-self: center;
    min-width: 120px;
  }

  .play-button:hover:not(:disabled) {
    background: #0056b3;
    transform: translateY(-1px);
  }

  .play-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .play-button.playing {
    background: #dc3545;
  }

  .progress-section {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .time-current,
  .time-total {
    font-size: 14px;
    color: #666;
    min-width: 45px;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    -webkit-appearance: none;
    background: #e9ecef;
    border-radius: 3px;
    outline: none;
  }

  .progress-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
  }

  .volume-control {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-end;
  }

  .volume-slider {
    width: 100px;
    height: 4px;
    -webkit-appearance: none;
    background: #e9ecef;
    border-radius: 2px;
    outline: none;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
  }

  @media (max-width: 600px) {
    .music-details {
      flex-direction: column;
      gap: 8px;
    }

    .progress-section {
      flex-wrap: wrap;
    }

    .time-current,
    .time-total {
      font-size: 12px;
    }
  }
</style>