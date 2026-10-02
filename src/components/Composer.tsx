import { useEffect, useRef, useState } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { Mic, Send } from './Icons';

interface Props {
  onSend: (text: string) => void;
  busy: boolean;
  variant: 'hero' | 'dock';
  placeholder?: string;
}

export function Composer({ onSend, busy, variant, placeholder }: Props) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeech((t) => setText(t));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, variant === 'hero' ? 200 : 140)}px`;
  }, [text, variant]);

  useEffect(() => {
    if (variant === 'hero' && window.matchMedia('(min-width: 768px)').matches) ref.current?.focus();
  }, [variant]);

  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    if (speech.listening) speech.stop();
    onSend(value);
    setText('');
  };

  const hero = variant === 'hero';
  return (
    <div>
      <div
        className={`flex items-end gap-2 rounded-[22px] border bg-white transition focus-within:border-navy-500 focus-within:shadow-lift ${
          hero ? 'border-line p-3 pl-5 shadow-soft' : 'border-line p-2 pl-4 shadow-soft'
        }`}
      >
        <textarea
          ref={ref}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder ?? 'Type or speak, in English or Roman Urdu…'}
          aria-label="Message"
          className={`min-w-0 flex-1 resize-none bg-transparent leading-6 text-navy outline-none placeholder:text-muted/70 ${
            hero ? 'py-2 text-[17px]' : 'py-2 text-[15px]'
          }`}
        />
        {speech.supported && (
          <button
            type="button"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            aria-label={speech.listening ? 'Stop voice input' : 'Speak your request'}
            title={speech.listening ? 'Listening… tap to stop' : 'Speak your request'}
            className={`grid size-10 shrink-0 place-items-center rounded-full transition ${
              speech.listening ? 'mic-live bg-orange text-white' : 'text-navy-500 hover:bg-sand hover:text-navy'
            }`}
          >
            <Mic size={20} />
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || busy}
          aria-label="Send"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-orange text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-sand disabled:text-navy-500/60"
        >
          <Send size={19} />
        </button>
      </div>
      {(speech.listening || speech.error) && (
        <p className={`mt-2 px-2 text-xs ${speech.error ? 'text-orange' : 'text-muted'}`} role="status">
          {speech.error ?? 'Listening… speak naturally, then tap send.'}
        </p>
      )}
    </div>
  );
}
