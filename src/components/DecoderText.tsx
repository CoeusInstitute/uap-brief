interface DecoderTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export default function DecoderText({ text, className = "" }: DecoderTextProps) {
  return <span className={className}>{text}</span>;
}
