// midi-parser.ts
import type {
  MIDIFile,
  HeaderChunk,
  TrackChunk,
  MIDIEvent,
  NoteEvent,
  ControlChangeEvent,
  ProgramChangeEvent,
  KeyPressureEvent,
  ChannelPressureEvent,
  PitchBendEvent,
  SystemEvent,
  MetaEvent,
  NoteInfo,
  TempoInfo,
  TimeSignature,
  KeySignature,
  TrackInfo,
  Controller,
  Instrument
} from './midi.types';

export class MIDIParser {
  private data: DataView;
  private position: number;
  private runningStatus: number = 0;
  
  private header: HeaderChunk | null = null;
  private tracks: TrackChunk[] = [];
  
  private noteMap = new Map<string, NoteInfo>();
  
  // 静态常量
  private static readonly CHUNK_HEADER = 'MThd';
  private static readonly CHUNK_TRACK = 'MTrk';
  
  private static readonly META_EVENT = 0xFF;
  
  private static readonly META_SEQUENCE_NUMBER = 0x00;
  private static readonly META_TEXT = 0x01;
  private static readonly META_COPYRIGHT = 0x02;
  private static readonly META_TRACK_NAME = 0x03;
  private static readonly META_INSTRUMENT_NAME = 0x04;
  private static readonly META_LYRIC = 0x05;
  private static readonly META_MARKER = 0x06;
  private static readonly META_CUE_POINT = 0x07;
  private static readonly META_CHANNEL_PREFIX = 0x20;
  private static readonly META_END_OF_TRACK = 0x2F;
  private static readonly META_SET_TEMPO = 0x51;
  private static readonly META_SMPTE_OFFSET = 0x54;
  private static readonly META_TIME_SIGNATURE = 0x58;
  private static readonly META_KEY_SIGNATURE = 0x59;
  private static readonly META_SEQUENCER_SPECIFIC = 0x7F;
  
  constructor() {}
  
  /**
   * 解析 MIDI 文件
   */
  public parse(arrayBuffer: ArrayBuffer): MIDIFile {
    this.data = new DataView(arrayBuffer);
    this.position = 0;
    this.runningStatus = 0;
    this.tracks = [];
    this.noteMap.clear();
    
    try {
      // 解析 Header
      this.header = this.parseHeader();
      
      // 解析所有轨道
      for (let i = 0; i < this.header.numTracks; i++) {
        const track = this.parseTrack(i);
        this.tracks.push(track);
      }
      
      return {
        header: this.header,
        tracks: this.tracks,
        duration: this.calculateDuration()
      };
    } catch (error) {
      throw new Error(`MIDI 解析失败: ${error.message}`);
    }
  }
  
  /**
   * 从 URL 加载并解析 MIDI 文件
   */
  public async parseFromUrl(url: string): Promise<MIDIFile> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return this.parse(arrayBuffer);
    } catch (error) {
      throw new Error(`加载 MIDI 文件失败: ${error.message}`);
    }
  }
  
  /**
   * 从 File 对象解析 MIDI 文件
   */
  public async parseFromFile(file: File): Promise<MIDIFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const midiFile = this.parse(arrayBuffer);
          resolve(midiFile);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * 解析 Header Chunk
   */
  private parseHeader(): HeaderChunk {
    // 验证 Chunk 类型
    const chunkType = this.readString(4);
    if (chunkType !== MIDIParser.CHUNK_HEADER) {
      throw new Error(`无效的 MIDI 文件头: ${chunkType}`);
    }
    
    // 读取 Header 长度
    const length = this.readUint32();
    if (length !== 6) {
      throw new Error(`Header 长度无效: ${length}`);
    }
    
    // 读取格式、轨道数、时间分割
    const format = this.readUint16() as 0 | 1 | 2;
    const numTracks = this.readUint16();
    const divisionRaw = this.readUint16();
    
    // 解析时间分割
    const isTicksPerBeat = !!(divisionRaw & 0x8000);
    
    if (isTicksPerBeat) {
      // 基于节拍的时间分割
      return {
        chunkType,
        length,
        format,
        numTracks,
        division: {
          raw: divisionRaw,
          isTicksPerBeat,
          ticksPerBeat: divisionRaw & 0x7FFF
        },
        isTicksPerBeat,
        ticksPerBeat: divisionRaw & 0x7FFF
      };
    } else {
      // 基于 SMPTE 的时间分割
      const smpteFormat = (divisionRaw & 0x7F00) >> 8;
      const ticksPerFrame = divisionRaw & 0x00FF;
      
      return {
        chunkType,
        length,
        format,
        numTracks,
        division: {
          raw: divisionRaw,
          isTicksPerBeat,
          smpteFormat,
          ticksPerFrame
        },
        isTicksPerBeat,
        smpteFormat,
        ticksPerFrame
      };
    }
  }
  
  /**
   * 解析 Track Chunk
   */
  private parseTrack(trackIndex: number): TrackChunk {
    const chunkType = this.readString(4);
    if (chunkType !== MIDIParser.CHUNK_TRACK) {
      throw new Error(`无效的 Track Chunk: ${chunkType}`);
    }
    
    const length = this.readUint32();
    const trackEnd = this.position + length;
    
    const events: MIDIEvent[] = [];
    let absoluteTime = 0;
    this.runningStatus = 0;
    
    // 解析所有事件
    while (this.position < trackEnd && this.position < this.data.byteLength) {
      const deltaTime = this.readVariableLength();
      absoluteTime += deltaTime;
      
      try {
        const event = this.parseEvent(deltaTime, absoluteTime);
        if (event) {
          events.push(event);
          
          // 更新运行状态（非系统事件）
          if (event.statusByte < 0xF0) {
            this.runningStatus = event.statusByte;
          }
        }
      } catch (error) {
        console.warn(`解析事件失败: ${error.message}`);
        // 跳过错误事件
        break;
      }
    }
    
    return {
      chunkType,
      length,
      events,
      trackIndex,
      getNotes: () => this.extractNotesFromEvents(events, trackIndex),
      getMetaEvents: () => events.filter((e): e is MetaEvent => e.type === 'meta')
    };
  }
  
  /**
   * 解析单个 MIDI 事件
   */
  private parseEvent(deltaTime: number, absoluteTime: number): MIDIEvent | null {
    let statusByte = this.data.getUint8(this.position);
    
    // 检查是否为运行状态
    const hasStatusByte = statusByte >= 0x80;
    if (!hasStatusByte) {
      if (this.runningStatus === 0) {
        throw new Error('缺少运行状态字节');
      }
      statusByte = this.runningStatus;
    } else {
      this.position++; // 消耗状态字节
    }
    
    const eventType = statusByte >> 4;
    const channel = statusByte & 0x0F;
    
    // 系统事件和元事件
    if (eventType === 0xF) {
      if (statusByte === MIDIParser.META_EVENT) {
        return this.parseMetaEvent(deltaTime, absoluteTime, statusByte);
      } else {
        return this.parseSystemEvent(deltaTime, absoluteTime, statusByte);
      }
    }
    
    // 通道事件
    switch (eventType) {
      case 0x8: // Note Off
        return this.parseNoteOff(deltaTime, absoluteTime, statusByte, channel);
        
      case 0x9: // Note On
        return this.parseNoteOn(deltaTime, absoluteTime, statusByte, channel);
        
      case 0xA: // Polyphonic Key Pressure
        return this.parseKeyPressure(deltaTime, absoluteTime, statusByte, channel);
        
      case 0xB: // Control Change
        return this.parseControlChange(deltaTime, absoluteTime, statusByte, channel);
        
      case 0xC: // Program Change
        return this.parseProgramChange(deltaTime, absoluteTime, statusByte, channel);
        
      case 0xD: // Channel Pressure
        return this.parseChannelPressure(deltaTime, absoluteTime, statusByte, channel);
        
      case 0xE: // Pitch Bend
        return this.parsePitchBend(deltaTime, absoluteTime, statusByte, channel);
        
      default:
        throw new Error(`未知事件类型: 0x${eventType.toString(16)}`);
    }
  }
  
  /**
   * 解析 Note Off 事件
   */
  private parseNoteOff(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number,
    channel: number
  ): NoteEvent {
    const noteNumber = this.readUint8();
    const velocity = this.readUint8();
    
    return {
      type: 'noteOff',
      deltaTime,
      absoluteTime,
      statusByte,
      channel,
      noteNumber,
      noteName: this.getNoteName(noteNumber),
      velocity,
      hex: {
        status: `0x${statusByte.toString(16).padStart(2, '0')}`,
        note: `0x${noteNumber.toString(16).padStart(2, '0')}`,
        velocity: `0x${velocity.toString(16).padStart(2, '0')}`
      }
    };
  }
  
  /**
   * 解析 Note On 事件
   */
  private parseNoteOn(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number,
    channel: number
  ): NoteEvent {
    const noteNumber = this.readUint8();
    const velocity = this.readUint8();
    
    // Velocity = 0 表示 Note Off
    const isNoteOff = velocity === 0;
    
    return {
      type: isNoteOff ? 'noteOff' : 'noteOn',
      deltaTime,
      absoluteTime,
      statusByte,
      channel,
      noteNumber,
      noteName: this.getNoteName(noteNumber),
      velocity,
      hex: {
        status: `0x${statusByte.toString(16).padStart(2, '0')}`,
        note: `0x${noteNumber.toString(16).padStart(2, '0')}`,
        velocity: `0x${velocity.toString(16).padStart(2, '0')}`
      }
    };
  }
  
  /**
   * 解析控制变更事件
   */
  private parseControlChange(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number,
    channel: number
  ): ControlChangeEvent {
    const controller = this.readUint8();
    const value = this.readUint8();
    
    return {
      type: 'controlChange',
      deltaTime,
      absoluteTime,
      statusByte,
      channel,
      controller,
      controllerName: this.getControllerName(controller),
      value,
      hex: {
        status: `0x${statusByte.toString(16).padStart(2, '0')}`,
        controller: `0x${controller.toString(16).padStart(2, '0')}`,
        value: `0x${value.toString(16).padStart(2, '0')}`
      }
    };
  }
  
  /**
   * 解析程序变更事件
   */
  private parseProgramChange(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number,
    channel: number
  ): ProgramChangeEvent {
    const program = this.readUint8();
    
    return {
      type: 'programChange',
      deltaTime,
      absoluteTime,
      statusByte,
      channel,
      program,
      instrument: this.getInstrumentName(program),
      hex: {
        status: `0x${statusByte.toString(16).padStart(2, '0')}`,
        program: `0x${program.toString(16).padStart(2, '0')}`
      }
    };
  }
  
  /**
   * 解析音色压力事件
   */
  private parseKeyPressure(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number,
    channel: number
  ): KeyPressureEvent {
    const noteNumber = this.readUint8();
    const pressure = this.readUint8();
    
    return {
      type: 'keyPressure',
      deltaTime,
      absoluteTime,
      statusByte,
      channel,
      noteNumber,
      pressure,
      hex: {
        status: `0x${statusByte.toString(16).padStart(2, '0')}`,
        note: `0x${noteNumber.toString(16).padStart(2, '0')}`,
        pressure: `0x${pressure.toString(16).padStart(2, '0')}`
      }
    };
  }
  
  /**
   * 解析通道压力事件
   */
  private parseChannelPressure(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number,
    channel: number
  ): ChannelPressureEvent {
    const pressure = this.readUint8();
    
    return {
      type: 'channelPressure',
      deltaTime,
      absoluteTime,
      statusByte,
      channel,
      pressure,
      hex: {
        status: `0x${statusByte.toString(16).padStart(2, '0')}`,
        pressure: `0x${pressure.toString(16).padStart(2, '0')}`
      }
    };
  }
  
  /**
   * 解析弯音事件
   */
  private parsePitchBend(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number,
    channel: number
  ): PitchBendEvent {
    const lsb = this.readUint8();
    const msb = this.readUint8();
    const value = (msb << 7) | lsb;
    const normalizedValue = (value - 8192) / 8192; // -1 到 1 范围
    
    return {
      type: 'pitchBend',
      deltaTime,
      absoluteTime,
      statusByte,
      channel,
      value,
      normalizedValue,
      hex: {
        status: `0x${statusByte.toString(16).padStart(2, '0')}`,
        lsb: `0x${lsb.toString(16).padStart(2, '0')}`,
        msb: `0x${msb.toString(16).padStart(2, '0')}`
      }
    };
  }
  
  /**
   * 解析系统事件
   */
  private parseSystemEvent(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number
  ): SystemEvent {
    // 根据系统事件类型跳过相应字节
    switch (statusByte) {
      case 0xF0: // System Exclusive
      case 0xF7: // End of Exclusive
        this.skipSystemExclusive();
        break;
        
      case 0xF1: // MIDI Time Code Quarter Frame
      case 0xF3: // Song Select
        this.position += 1;
        break;
        
      case 0xF2: // Song Position Pointer
        this.position += 2;
        break;
        
      case 0xF4: // Undefined
      case 0xF5: // Undefined
      case 0xF6: // Tune Request
      case 0xF8: // Timing Clock
      case 0xF9: // Undefined
      case 0xFA: // Start
      case 0xFB: // Continue
      case 0xFC: // Stop
      case 0xFD: // Undefined
      case 0xFE: // Active Sensing
      case 0xFF: // System Reset
        // 无数据字节
        break;
    }
    
    return {
      type: 'system',
      deltaTime,
      absoluteTime,
      statusByte,
      systemType: this.getSystemEventType(statusByte)
    };
  }
  
  /**
   * 解析元事件
   */
  private parseMetaEvent(
    deltaTime: number,
    absoluteTime: number,
    statusByte: number
  ): MetaEvent {
    const metaType = this.readUint8();
    const length = this.readVariableLength();
    const dataStart = this.position;
    
    let data: any = null;
    let text: string | null = null;
    
    try {
      switch (metaType) {
        case MIDIParser.META_SEQUENCE_NUMBER:
          data = this.readUint16();
          break;
          
        case MIDIParser.META_TEXT:
        case MIDIParser.META_COPYRIGHT:
        case MIDIParser.META_TRACK_NAME:
        case MIDIParser.META_INSTRUMENT_NAME:
        case MIDIParser.META_LYRIC:
        case MIDIParser.META_MARKER:
        case MIDIParser.META_CUE_POINT:
          text = this.readString(length);
          break;
          
        case MIDIParser.META_CHANNEL_PREFIX:
          data = this.readUint8();
          break;
          
        case MIDIParser.META_END_OF_TRACK:
          // 无数据
          break;
          
        case MIDIParser.META_SET_TEMPO:
          const tempo = this.readUint24();
          data = {
            tempo,
            bpm: Math.round(60000000 / tempo)
          };
          break;
          
        case MIDIParser.META_SMPTE_OFFSET:
          data = {
            hour: this.readUint8(),
            minute: this.readUint8(),
            second: this.readUint8(),
            frame: this.readUint8(),
            fractionalFrame: this.readUint8()
          };
          break;
          
        case MIDIParser.META_TIME_SIGNATURE:
          const numerator = this.readUint8();
          const denominatorPower = this.readUint8();
          const clocksPerClick = this.readUint8();
          const thirtySecondNotesPerQuarter = this.readUint8();
          
          data = {
            numerator,
            denominator: Math.pow(2, denominatorPower),
            denominatorPower,
            clocksPerClick,
            thirtySecondNotesPerQuarter
          };
          break;
          
        case MIDIParser.META_KEY_SIGNATURE:
          const sharpsFlats = this.readInt8();
          const isMinor = this.readUint8() === 1;
          
          data = {
            sharpsFlats,
            isMinor,
            key: this.getKeyName(sharpsFlats, isMinor)
          };
          break;
          
        case MIDIParser.META_SEQUENCER_SPECIFIC:
          data = this.readBytes(length);
          break;
          
        default:
          // 跳过未知元事件
          this.position += length;
          data = `Unknown meta event 0x${metaType.toString(16)}`;
      }
    } finally {
      // 确保位置正确
      if (this.position !== dataStart + length) {
        this.position = dataStart + length;
      }
    }
    
    return {
      type: 'meta',
      deltaTime,
      absoluteTime,
      statusByte,
      metaType,
      metaTypeName: this.getMetaTypeName(metaType),
      length,
      data,
      text: text || undefined
    };
  }
  
  /**
   * 跳过系统独占数据
   */
  private skipSystemExclusive(): void {
    let byte: number;
    do {
      byte = this.readUint8();
    } while (byte !== 0xF7 && this.position < this.data.byteLength);
  }
  
  // ==================== 读取辅助方法 ====================
  
  /**
   * 读取可变长度整数
   */
  private readVariableLength(): number {
    let value = 0;
    let byte: number;
    
    do {
      byte = this.readUint8();
      value = (value << 7) | (byte & 0x7F);
    } while (byte & 0x80);
    
    return value;
  }
  
  /**
   * 读取字符串
   */
  private readString(length: number): string {
    const bytes: number[] = [];
    for (let i = 0; i < length; i++) {
      bytes.push(this.readUint8());
    }
    return String.fromCharCode(...bytes);
  }
  
  /**
   * 读取字节数组
   */
  private readBytes(length: number): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < length; i++) {
      bytes.push(this.readUint8());
    }
    return bytes;
  }
  
  /**
   * 读取 8 位无符号整数
   */
  private readUint8(): number {
    const value = this.data.getUint8(this.position);
    this.position++;
    return value;
  }
  
  /**
   * 读取 16 位无符号整数（大端序）
   */
  private readUint16(): number {
    const value = this.data.getUint16(this.position);
    this.position += 2;
    return value;
  }
  
  /**
   * 读取 32 位无符号整数（大端序）
   */
  private readUint32(): number {
    const value = this.data.getUint32(this.position);
    this.position += 4;
    return value;
  }
  
  /**
   * 读取 24 位无符号整数
   */
  private readUint24(): number {
    const byte1 = this.readUint8();
    const byte2 = this.readUint8();
    const byte3 = this.readUint8();
    return (byte1 << 16) | (byte2 << 8) | byte3;
  }
  
  /**
   * 读取 8 位有符号整数
   */
  private readInt8(): number {
    const value = this.data.getInt8(this.position);
    this.position++;
    return value;
  }
  
  // ==================== 数据提取方法 ====================
  
  /**
   * 从事件中提取音符信息
   */
  private extractNotesFromEvents(events: MIDIEvent[], trackIndex: number): NoteInfo[] {
    const notes: NoteInfo[] = [];
    const activeNotes = new Map<string, Partial<NoteInfo>>();
    
    for (const event of events) {
      if (event.type === 'noteOn' && event.velocity > 0) {
        // Note On 事件
        const key = `${event.channel}-${event.noteNumber}`;
        activeNotes.set(key, {
          trackIndex,
          channel: event.channel,
          noteNumber: event.noteNumber,
          noteName: event.noteName,
          start: event.absoluteTime,
          velocity: event.velocity
        });
      } else if (event.type === 'noteOff' || 
                (event.type === 'noteOn' && event.velocity === 0)) {
        // Note Off 事件
        const key = `${event.channel}-${event.noteNumber}`;
        const startInfo = activeNotes.get(key);
        
        if (startInfo) {
          const duration = event.absoluteTime - startInfo.start!;
          
          notes.push({
            trackIndex,
            channel: event.channel!,
            noteNumber: event.noteNumber,
            noteName: event.noteName,
            start: startInfo.start!,
            end: event.absoluteTime,
            duration,
            velocity: startInfo.velocity!,
            ticks: duration
          });
          
          activeNotes.delete(key);
        }
      }
    }
    
    return notes;
  }
  
  /**
   * 计算总时长
   */
  private calculateDuration(): DurationInfo {
    if (!this.header || this.tracks.length === 0) {
      return { ticks: 0 };
    }
    
    let maxTime = 0;
    
    for (const track of this.tracks) {
      for (const event of track.events) {
        if (event.absoluteTime > maxTime) {
          maxTime = event.absoluteTime;
        }
      }
    }
    
    return {
      ticks: maxTime,
      timebase: this.header.ticksPerBeat
    };
  }
  
  /**
   * 获取所有音符
   */
  public getAllNotes(): NoteInfo[] {
    const allNotes: NoteInfo[] = [];
    
    for (const track of this.tracks) {
      const trackNotes = track.getNotes();
      allNotes.push(...trackNotes);
    }
    
    return allNotes.sort((a, b) => a.start - b.start);
  }
  
  /**
   * 获取轨道信息
   */
  public getTrackInfos(): TrackInfo[] {
    return this.tracks.map((track, index) => {
      const metaEvents = track.getMetaEvents();
      const name = metaEvents.find(e => 
        e.metaType === MIDIParser.META_TRACK_NAME
      )?.text || `Track ${index}`;
      
      const instrument = metaEvents.find(e => 
        e.metaType === MIDIParser.META_INSTRUMENT_NAME
      )?.text;
      
      // 查找程序变更事件
      const programEvent = track.events.find((e): e is ProgramChangeEvent => 
        e.type === 'programChange'
      );
      
      return {
        index,
        name,
        instrument,
        channel: programEvent?.channel,
        program: programEvent?.program,
        eventCount: track.events.length,
        noteCount: track.getNotes().length
      };
    });
  }
  
  /**
   * 获取速度变化
   */
  public getTempoChanges(): TempoInfo[] {
    const tempos: TempoInfo[] = [];
    
    for (const track of this.tracks) {
      const metaEvents = track.getMetaEvents();
      for (const event of metaEvents) {
        if (event.metaType === MIDIParser.META_SET_TEMPO && event.data) {
          tempos.push({
            time: event.absoluteTime,
            tempo: event.data.tempo,
            bpm: event.data.bpm
          });
        }
      }
    }
    
    return tempos.sort((a, b) => a.time - b.time);
  }
  
  /**
   * 获取时间签名
   */
  public getTimeSignatures(): TimeSignature[] {
    const signatures: TimeSignature[] = [];
    
    for (const track of this.tracks) {
      const metaEvents = track.getMetaEvents();
      for (const event of metaEvents) {
        if (event.metaType === MIDIParser.META_TIME_SIGNATURE && event.data) {
          signatures.push({
            time: event.absoluteTime,
            numerator: event.data.numerator,
            denominator: event.data.denominator,
            clocksPerClick: event.data.clocksPerClick,
            thirtySecondNotesPerQuarter: event.data.thirtySecondNotesPerQuarter
          });
        }
      }
    }
    
    return signatures.sort((a, b) => a.time - b.time);
  }
  
  /**
   * 获取调号
   */
  public getKeySignatures(): KeySignature[] {
    const keys: KeySignature[] = [];
    
    for (const track of this.tracks) {
      const metaEvents = track.getMetaEvents();
      for (const event of metaEvents) {
        if (event.metaType === MIDIParser.META_KEY_SIGNATURE && event.data) {
          keys.push({
            time: event.absoluteTime,
            sharpsFlats: event.data.sharpsFlats,
            isMinor: event.data.isMinor,
            key: event.data.key
          });
        }
      }
    }
    
    return keys.sort((a, b) => a.time - b.time);
  }
  
  /**
   * 获取文本事件（歌词、标记等）
   */
  public getTextEvents(types: number[] = [
    MIDIParser.META_TEXT,
    MIDIParser.META_LYRIC,
    MIDIParser.META_MARKER,
    MIDIParser.META_CUE_POINT
  ]): Array<{time: number; text: string; type: number}> {
    const texts: Array<{time: number; text: string; type: number}> = [];
    
    for (const track of this.tracks) {
      const metaEvents = track.getMetaEvents();
      for (const event of metaEvents) {
        if (types.includes(event.metaType) && event.text) {
          texts.push({
            time: event.absoluteTime,
            text: event.text,
            type: event.metaType
          });
        }
      }
    }
    
    return texts.sort((a, b) => a.time - b.time);
  }
  
  // ==================== 工具方法 ====================
  
  /**
   * 获取音符名称
   */
  private getNoteName(noteNumber: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    const note = notes[noteNumber % 12];
    return `${note}${octave}`;
  }
  
  /**
   * 获取控制器名称
   */
  private getControllerName(controller: number): string {
    const controllerNames: Record<number, string> = {
      0: 'Bank Select',
      1: 'Modulation Wheel',
      2: 'Breath Controller',
      4: 'Foot Controller',
      5: 'Portamento Time',
      6: 'Data Entry MSB',
      7: 'Volume',
      8: 'Balance',
      10: 'Pan',
      11: 'Expression',
      12: 'Effect Control 1',
      13: 'Effect Control 2',
      32: 'LSB for 0-31',
      64: 'Sustain Pedal',
      65: 'Portamento',
      66: 'Sostenuto',
      67: 'Soft Pedal',
      68: 'Legato Footswitch',
      69: 'Hold 2',
      70: 'Sound Variation',
      71: 'Timbre/Harmonic Intensity',
      72: 'Release Time',
      73: 'Attack Time',
      74: 'Brightness',
      75: 'Decay Time',
      76: 'Vibrato Rate',
      77: 'Vibrato Depth',
      78: 'Vibrato Delay',
      79: 'Undefined',
      80: 'General Purpose 5',
      81: 'General Purpose 6',
      82: 'General Purpose 7',
      83: 'General Purpose 8',
      84: 'Portamento Control',
      91: 'External Effects Depth',
      92: 'Tremolo Depth',
      93: 'Chorus Depth',
      94: 'Detune Depth',
      95: 'Phaser Depth',
      96: 'Data Increment',
      97: 'Data Decrement',
      98: 'NRPN LSB',
      99: 'NRPN MSB',
      100: 'RPN LSB',
      101: 'RPN MSB',
      120: 'All Sound Off',
      121: 'Reset All Controllers',
      122: 'Local Control',
      123: 'All Notes Off',
      124: 'Omni Mode Off',
      125: 'Omni Mode On',
      126: 'Mono Mode',
      127: 'Poly Mode'
    };
    
    return controllerNames[controller] || `Controller ${controller}`;
  }
  
  /**
   * 获取乐器名称
   */
  private getInstrumentName(program: number): string {
    const instruments = [
      'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano',
      'Honky-tonk Piano', 'Electric Piano 1', 'Electric Piano 2', 'Harpsichord',
      'Clavinet', 'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone',
      'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
      'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ',
      'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
      'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)',
      'Electric Guitar (clean)', 'Electric Guitar (muted)', 'Overdriven Guitar',
      'Distortion Guitar', 'Guitar Harmonics', 'Acoustic Bass',
      'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass',
      'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
      'Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings',
      'Pizzicato Strings', 'Orchestral Harp', 'Timpani',
      'String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1',
      'Synth Strings 2', 'Choir Aahs', 'Voice Oohs', 'Synth Voice',
      'Orchestra Hit', 'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet',
      'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
      'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax', 'Oboe',
      'English Horn', 'Bassoon', 'Clarinet', 'Piccolo', 'Flute',
      'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi', 'Whistle',
      'Ocarina', 'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)',
      'Lead 4 (chiff)', 'Lead 5 (charang)', 'Lead 6 (voice)',
      'Lead 7 (fifths)', 'Lead 8 (bass + lead)', 'Pad 1 (new age)',
      'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)', 'Pad 5 (bowed)',
      'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
      'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)',
      'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
      'Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bagpipe', 'Fiddle',
      'Shanai', 'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock',
      'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
      'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet',
      'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot'
    ];
    
    return instruments[program] || `Program ${program}`;
  }
  
  /**
   * 获取元事件类型名称
   */
  private getMetaTypeName(metaType: number): string {
    const metaTypeNames: Record<number, string> = {
      0x00: 'Sequence Number',
      0x01: 'Text Event',
      0x02: 'Copyright Notice',
      0x03: 'Track Name',
      0x04: 'Instrument Name',
      0x05: 'Lyric',
      0x06: 'Marker',
      0x07: 'Cue Point',
      0x20: 'MIDI Channel Prefix',
      0x2F: 'End of Track',
      0x51: 'Set Tempo',
      0x54: 'SMPTE Offset',
      0x58: 'Time Signature',
      0x59: 'Key Signature',
      0x7F: 'Sequencer Specific'
    };
    
    return metaTypeNames[metaType] || `Meta 0x${metaType.toString(16)}`;
  }
  
  /**
   * 获取系统事件类型
   */
  private getSystemEventType(statusByte: number): SystemEventType {
    const systemTypes: Record<number, SystemEventType> = {
      0xF0: 'systemExclusive',
      0xF1: 'midiTimeCode',
      0xF2: 'songPositionPointer',
      0xF3: 'songSelect',
      0xF4: 'unknown',
      0xF5: 'unknown',
      0xF6: 'tuneRequest',
      0xF7: 'endOfExclusive',
      0xF8: 'timingClock',
      0xF9: 'unknown',
      0xFA: 'start',
      0xFB: 'continue',
      0xFC: 'stop',
      0xFD: 'unknown',
      0xFE: 'activeSensing',
      0xFF: 'systemReset'
    };
    
    return systemTypes[statusByte] || 'unknown';
  }
  
  /**
   * 获取调号名称
   */
  private getKeyName(sharpsFlats: number, isMinor: boolean): string {
    const majorKeys = [
      'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
      'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'
    ];
    const minorKeys = [
      'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#',
      'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'
    ];
    
    const index = sharpsFlats + 7;
    if (index < 0 || index >= majorKeys.length) {
      return 'Unknown';
    }
    
    return isMinor 
      ? `${minorKeys[index]} minor` 
      : `${majorKeys[index]} major`;
  }
  
  /**
   * 验证 MIDI 文件
   */
  public static validate(arrayBuffer: ArrayBuffer): boolean {
    try {
      const data = new DataView(arrayBuffer);
      const chunkType = String.fromCharCode(
        data.getUint8(0),
        data.getUint8(1),
        data.getUint8(2),
        data.getUint8(3)
      );
      
      return chunkType === MIDIParser.CHUNK_HEADER;
    } catch {
      return false;
    }
  }
  
  /**
   * 转换为 JSON（用于调试）
   */
  public toJSON(midiFile: MIDIFile): any {
    return {
      header: midiFile.header,
      tracks: midiFile.tracks.map(track => ({
        index: track.trackIndex,
        length: track.length,
        eventCount: track.events.length,
        noteCount: track.getNotes().length,
        events: track.events.map(event => ({
          type: event.type,
          deltaTime: event.deltaTime,
          absoluteTime: event.absoluteTime,
          ...(event.channel !== undefined && { channel: event.channel }),
          ...('noteNumber' in event && { 
            noteNumber: event.noteNumber,
            noteName: event.noteName 
          }),
          ...('velocity' in event && { velocity: event.velocity }),
          ...('text' in event && event.text && { text: event.text }),
          ...('data' in event && event.data && { data: event.data })
        }))
      }))
    };
  }
}