/**
 * Visual Feedback System
 * Emoji reactions and progress indicators for agent operations
 */

class VisualFeedback {
  constructor() {
    this.spinners = ['⏳', '⌛', '⏰', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
    this.currentSpinner = 0;
    this.intervals = new Map();
  }

  // Emoji mappings for different actions
  static emojis = {
    // Status indicators
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    pending: '⏳',
    processing: '🔄',
    thinking: '🤔',
    complete: '🎉',
    
    // Action types
    memory: '🧠',
    code: '💻',
    command: '🔧',
    deploy: '🚀',
    search: '🔍',
    analyze: '📊',
    write: '✍️',
    read: '📖',
    delete: '🗑️',
    create: '✨',
    update: '🔄',
    sync: '☁️',
    lock: '🔒',
    unlock: '🔓',
    
    // File operations
    file: '📄',
    folder: '📁',
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    zip: '📦',
    
    // Communication
    email: '📧',
    chat: '💬',
    phone: '📞',
    notification: '🔔',
    
    // Cloud Storage
    cloud: '☁️',
    upload: '⬆️',
    download: '⬇️',
    sync: '🔄',
    storage: '💾',
    database: '🗄️',
    backup: '💿',
    folder: '📁',
    file: '📄',

    // AI/Agent
    robot: '🤖',
    brain: '🧠',
    sparkles: '✨',
    magic: '🪄',
    target: '🎯',
    lightbulb: '💡',
    
    // Progress
    step1: '1️⃣',
    step2: '2️⃣',
    step3: '3️⃣',
    step4: '4️⃣',
    step5: '5️⃣',
    arrow: '➡️',
    check: '✓',
    cross: '✗',
    
    // Time
    clock: '🕐',
    fast: '⚡',
    slow: '🐌',
    wait: '⏳'
  };

  /**
   * Get emoji for a specific action/state
   */
  static get(emojiName, fallback = '') {
    return this.emojis[emojiName] || fallback;
  }

  /**
   * Create a thinking indicator message
   */
  thinking(message = 'Thinking', showDots = true) {
    const emoji = VisualFeedback.get('thinking');
    return `${emoji} ${message}${showDots ? '...' : ''}`;
  }

  /**
   * Create a progress message with spinner
   */
  progress(action, detail = '') {
    const spinner = this.spinners[this.currentSpinner];
    this.currentSpinner = (this.currentSpinner + 1) % this.spinners.length;
    const detailStr = detail ? ` - ${detail}` : '';
    return `${spinner} ${action}${detailStr}`;
  }

  /**
   * Start animated progress indicator (for async operations)
   */
  startProgress(id, action, callback, intervalMs = 500) {
    let step = 0;
    const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    
    const interval = setInterval(() => {
      const spinner = spinnerChars[step % spinnerChars.length];
      callback(`${spinner} ${action}...`);
      step++;
    }, intervalMs);
    
    this.intervals.set(id, interval);
    return interval;
  }

  /**
   * Stop progress indicator
   */
  stopProgress(id) {
    if (this.intervals.has(id)) {
      clearInterval(this.intervals.get(id));
      this.intervals.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Format success message
   */
  static success(message, details = '') {
    const emoji = this.get('success');
    const detailStr = details ? `\n${details}` : '';
    return `${emoji} ${message}${detailStr}`;
  }

  /**
   * Format error message
   */
  static error(message, details = '') {
    const emoji = this.get('error');
    const detailStr = details ? `\n${this.get('warning')} ${details}` : '';
    return `${emoji} ${message}${detailStr}`;
  }

  /**
   * Format info message
   */
  static info(message, emoji = 'info') {
    return `${this.get(emoji, 'ℹ️')} ${message}`;
  }

  /**
   * Create progress bar
   */
  static progressBar(current, total, length = 20) {
    if (!total || total <= 0) {
      const emptyBar = '░'.repeat(length);
      return `${emptyBar} 0%`;
    }

    const boundedCurrent = Math.max(0, Math.min(current, total));
    const percentage = Math.round((boundedCurrent / total) * 100);
    const filled = Math.round((boundedCurrent / total) * length);
    const empty = length - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${percentage}%`;
  }

  /**
   * Format step-by-step progress
   */
  static steps(steps, currentStep) {
    return steps.map((step, index) => {
      if (index < currentStep) {
        return `${this.get('success')} ${step}`;
      } else if (index === currentStep) {
        return `${this.get('processing')} ${step}`;
      } else {
        return `${this.get('pending')} ${step}`;
      }
    }).join('\n');
  }

  /**
   * Format action result with emoji
   */
  static actionResult(action, success, result = '') {
    const emoji = success ? this.get('success') : this.get('error');
    const resultStr = result ? `\n${this.get('arrow')} ${result}` : '';
    return `${emoji} ${action}${resultStr}`;
  }

  /**
   * Create visual task list
   */
  static taskList(tasks) {
    return tasks.map((task, index) => {
      const num = index + 1;
      const status = task.done ? this.get('success') : 
                     task.inProgress ? this.get('processing') : 
                     this.get('pending');
      const name = task.inProgress ? `*${task.name}*` : task.name;
      return `${status} ${num}. ${name}`;
    }).join('\n');
  }

  /**
   * Format memory operation
   */
  static memory(action, key, value = '') {
    const emoji = this.get('memory');
    const actionEmoji = action === 'save' ? this.get('lock') : 
                        action === 'recall' ? this.get('unlock') : 
                        this.get('sync');
    const valueStr = value ? `: \`${value}\`` : '';
    return `${emoji} ${actionEmoji} ${action} \`${key}\`${valueStr}`;
  }

  /**
   * Format code execution
   */
  static codeExecution(language, status, output = '') {
    const emoji = this.get('code');
    const statusEmoji = status === 'running' ? this.get('processing') :
                        status === 'success' ? this.get('success') :
                        this.get('error');
    const outputStr = output ? `\n\`\`\`\n${output.substring(0, 500)}\n\`\`\`` : '';
    return `${emoji} ${statusEmoji} ${language} ${status}${outputStr}`;
  }

  /**
   * Format command execution
   */
  static command(command, status, output = '') {
    const emoji = this.get('command');
    const statusEmoji = status === 'running' ? this.get('processing') :
                        status === 'success' ? this.get('success') :
                        this.get('error');
    return `${emoji} ${statusEmoji} \`${command}\`${output ? '\n' + output : ''}`;
  }

  /**
   * Format autonomous task
   */
  static autonomousTask(task, stage, progress = 0) {
    const robot = this.get('robot');
    const sparkles = this.get('sparkles');
    
    if (stage === 'planning') {
      return `${robot} ${sparkles} Planning autonomous task:\n${this.get('thinking')} ${task}`;
    } else if (stage === 'executing') {
      const bar = this.progressBar(progress, 100);
      return `${robot} ${this.get('processing')} Executing:\n${bar}\n${this.get('arrow')} ${task}`;
    } else if (stage === 'complete') {
      return `${robot} ${this.get('success')} Task complete!\n${this.get('check')} ${task}`;
    }
  }

  /**
   * Create visual timeline
   */
  static timeline(events) {
    return events.map((event, index) => {
      const isLast = index === events.length - 1;
      const connector = isLast ? '└─' : '├─';
      const emoji = event.completed ? this.get('success') : 
                    event.current ? this.get('processing') :
                    this.get('pending');
      const time = event.time ? ` (${event.time})` : '';
      return `${connector} ${emoji} ${event.name}${time}`;
    }).join('\n');
  }

  /**
   * Format goal status
   */
  static goal(goal, status, progress = 0) {
    const target = this.get('target');
    const bar = this.progressBar(progress, 100);
    const statusEmoji = status === 'completed' ? this.get('success') :
                        status === 'in_progress' ? this.get('processing') :
                        this.get('pending');
    return `${target} ${statusEmoji} ${goal}\n${bar}`;
  }

  /**
   * Format cloud storage operation
   */
  static cloudStorage(action, fileName, size = '', status = 'running') {
    const cloud = this.get('cloud');
    const actionEmoji = action === 'upload' ? this.get('upload') :
                        action === 'download' ? this.get('download') :
                        action === 'sync' ? this.get('sync') :
                        this.get('storage');
    const statusEmoji = status === 'running' ? this.get('processing') :
                        status === 'success' ? this.get('success') :
                        this.get('error');
    const sizeStr = size ? ` (${size})` : '';
    return `${cloud} ${actionEmoji} ${statusEmoji} ${action} ${fileName}${sizeStr}`;
  }

  /**
   * Format file list
   */
  static fileList(files, title = 'Files') {
    const folder = this.get('folder');
    let result = `${folder} ${title}:\n`;
    files.forEach((file, i) => {
      const fileEmoji = this.get('file');
      const size = file.fileSize ? ` (${this.formatBytes(file.fileSize)})` : '';
      result += `${i + 1}. ${fileEmoji} ${file.fileName}${size}\n`;
    });
    return result;
  }

  /**
   * Format storage stats
   */
  static storageStats(stats) {
    const storage = this.get('storage');
    const cloud = this.get('cloud');
    return `${cloud} ${storage} Storage Stats:\n` +
           `${this.get('file')} Total Files: ${stats.totalFiles}\n` +
           `${this.get('storage')} Total Size: ${stats.totalSizeFormatted}`;
  }

  /**
   * Format bytes to human readable
   */
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = VisualFeedback;
