export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes?.[i];
};

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date?.toDateString() === now?.toDateString();
  
  const timeString = date?.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) {
    return timeString;
  }

  return `${date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeString}`;
};

export const handleFileDownload = (file) => {
  const url = file?.preview || URL.createObjectURL(file?.file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file?.name;
  document.body?.appendChild(link);
  link?.click();
  document.body?.removeChild(link);
};
