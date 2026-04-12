// simplified-midi-parser.ts

export interface SimplifiedMIDI {
  format: number;
  tracks: number;
  division: number;
  notes: Array<{
    track: number;
    channel: number;
    note: number;
    noteName: string;
    time: number;
    duration: number;
    velocity: number;
  }>;
  tempo: number;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
}

export class SimplifiedMIDIParser {
  private data: DataView;
  private pos: number = 0;
  
  parse(arrayBuffer: ArrayBuffer): SimplifiedMIDI {
    this.data = new DataView(arrayBuffer);
    this.pos = 0;
    
    // 解析头部
    this.skipString(4); // 'MThd'
    this.skipUint32(); // 长度
    const format = this.readUint16();
    const tracks = this.readUint16();
    const division = this.readUint16();
    
    const notes: SimplifiedMIDI['notes'] = [];
    let tempo = 120; // 默认 120 BPM
    let timeSignature = { numerator: 4, denominator: 4 }; // 默认 4/4
    
    // 解析轨道
    for (let trackIndex = 0; trackIndex < tracks; trackIndex++) {
      this.skipString(4); // 'MTrk'
      const trackLength = this.readUint32();
      const trackEnd = this.pos + trackLength;
      
      let absoluteTime = 0;
      const activeNotes = new Map<string, { time: number; velocity: number }>();
      
      while (this.pos < trackEnd) {
        const deltaTime = this.readVariableLength();
        absoluteTime += deltaTime;
        
        const statusByte = this.data.getUint8(this.pos);
        
        if (statusByte === 0xFF) { // Meta 事件
          this.pos++;
          const metaType = this.readUint8();
          const length = this.readVariableLength();
          
          if (metaType === 0x51) { // 设置速度
            const tempoMicroseconds = this.readUint24();
            tempo = Math.round(60000000 / tempoMicroseconds);
            this.pos += length - 3;
          } else if (metaType === 0x58) { // 时间签名
            timeSignature = {
              numerator: this.readUint8(),
              denominator: Math.pow(2, this.readUint8())
            };
            this.pos += length - 2;
          } else {
            this.pos += length;
          }
        } else if (statusByte >= 0x80 && statusByte < 0xF0) {
          // 通道事件
          const eventType = statusByte >> 4;
          const channel = statusByte & 0x0F;
          
          this.pos++; // 跳过状态字节
          
          if (eventType === 0x8 || eventType === 0x9) { // Note Off/On
            const note = this.readUint8();
            const velocity = this.readUint8();
            
            const key = `${channel}-${note}`;
            
            if (eventType === 0x9 && velocity > 0) { // Note On
              activeNotes.set(key, {
                time: absoluteTime,
                velocity
              });
            } else { // Note Off
              const startNote = activeNotes.get(key);
              if (startNote) {
                const duration = absoluteTime - startNote.time;
                notes.push({
                  track: trackIndex,
                  channel,
                  note,
                  noteName: this.getNoteName(note),
                  time: startNote.time,
                  duration,
                  velocity: startNote.velocity
                });
                activeNotes.delete(key);
              }
            }
          } else {
            // 跳过其他事件
            const eventLength = this.getEventLength(eventType);
            this.pos += eventLength;
          }
        } else {
          this.pos++; // 跳过未知字节
        }
      }
    }
    
    return {
      format,
      tracks,
      division,
      notes,
      tempo,
      timeSignature
    };
  }
  
  private readVariableLength(): number {
    let value = 0;
    let byte: number;
    
    do {
      byte = this.readUint8();
      value = (value << 7) | (byte & 0x7F);
    } while (byte & 0x80);
    
    return value;
  }
  
  private readUint8(): number {
    return this.data.getUint8(this.pos++);
  }
  
  private readUint16(): number {
    const value = this.data.getUint16(this.pos);
    this.pos += 2;
    return value;
  }
  
  private readUint32(): number {
    const value = this.data.getUint32(this.pos);
    this.pos += 4;
    return value;
  }
  
  private readUint24(): number {
    const byte1 = this.readUint8();
    const byte2 = this.readUint8();
    const byte3 = this.readUint8();
    return (byte1 << 16) | (byte2 << 8) | byte3;
  }
  
  private skipString(length: number): void {
    this.pos += length;
  }
  
  private skipUint32(): void {
    this.pos += 4;
  }
  
  private getEventLength(eventType: number): number {
    switch (eventType) {
      case 0xC: // Program Change
      case 0xD: // Channel Pressure
        return 1;
      case 0x8: // Note Off
      case 0x9: // Note On
      case 0xA: // Poly Pressure
      case 0xB: // Control Change
      case 0xE: // Pitch Bend
        return 2;
      default:
        return 0;
    }
  }
  
  private getNoteName(noteNumber: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    return `${notes[noteNumber % 12]}${octave}`;
  }
}