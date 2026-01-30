
import { FileText, FileMinus, File } from 'lucide-react';

interface FileIconProps {
  fileName: string;
  fileType?: string;
  className?: string;
}

const FileIcon = ({ fileName, fileType, className = "h-4 w-4" }: FileIconProps) => {
  const getFileIcon = () => {
    if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      return <FileMinus className={`${className} text-red-500`} />;
    }
    
    if (fileName.toLowerCase().match(/\.(txt|md|csv)$/)) {
      return <FileText className={`${className} text-blue-500`} />;
    }
    
    return <File className={`${className} text-gray-500`} />;
  };

  return getFileIcon();
};

export default FileIcon;
