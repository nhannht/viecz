package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Log levels (like Android logcat)
const (
	LevelDebug = "DEBUG"
	LevelInfo  = "INFO"
	LevelWarn  = "WARN"
	LevelError = "ERROR"
)

// Init initializes the logger with console output (like logcat)
func Init(level string) {
	// Pretty console writer (colored output)
	output := zerolog.ConsoleWriter{
		Out:        os.Stdout,
		TimeFormat: "2006-01-02 15:04:05",
		NoColor:    false,
		FormatLevel: func(i interface{}) string {
			if ll, ok := i.(string); ok {
				switch ll {
				case "debug":
					return "\033[36mD\033[0m" // Cyan
				case "info":
					return "\033[32mI\033[0m" // Green
				case "warn":
					return "\033[33mW\033[0m" // Yellow
				case "error":
					return "\033[31mE\033[0m" // Red
				default:
					return ll
				}
			}
			return ""
		},
	}

	log.Logger = log.Output(output)

	// Set global level
	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	}
}

// Tagged logger (like Android Log.d(TAG, message))
type Logger struct {
	tag string
}

// New creates a new tagged logger
func New(tag string) *Logger {
	return &Logger{tag: tag}
}

// D - Debug log (like Log.d in Android)
func (l *Logger) D(message string, fields ...interface{}) {
	event := log.Debug().Str("tag", l.tag)
	l.addFields(event, fields...)
	event.Msg(message)
}

// I - Info log (like Log.i in Android)
func (l *Logger) I(message string, fields ...interface{}) {
	event := log.Info().Str("tag", l.tag)
	l.addFields(event, fields...)
	event.Msg(message)
}

// W - Warning log (like Log.w in Android)
func (l *Logger) W(message string, fields ...interface{}) {
	event := log.Warn().Str("tag", l.tag)
	l.addFields(event, fields...)
	event.Msg(message)
}

// E - Error log (like Log.e in Android)
func (l *Logger) E(message string, err error, fields ...interface{}) {
	event := log.Error().Str("tag", l.tag)
	if err != nil {
		event = event.Err(err)
	}
	l.addFields(event, fields...)
	event.Msg(message)
}

// addFields adds key-value pairs to the log event
func (l *Logger) addFields(event *zerolog.Event, fields ...interface{}) {
	for i := 0; i < len(fields)-1; i += 2 {
		key, ok := fields[i].(string)
		if !ok {
			continue
		}
		value := fields[i+1]

		switch v := value.(type) {
		case string:
			event.Str(key, v)
		case int:
			event.Int(key, v)
		case int64:
			event.Int64(key, v)
		case bool:
			event.Bool(key, v)
		case time.Duration:
			event.Dur(key, v)
		default:
			event.Interface(key, v)
		}
	}
}
