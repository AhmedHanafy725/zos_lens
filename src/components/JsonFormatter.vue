<template>
  <pre class="json-formatter" v-html="formattedJson"></pre>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  data: unknown;
  indent?: number;
}

const props = withDefaults(defineProps<Props>(), {
  indent: 2
});

const formattedJson = computed(() => {
  try {
    const jsonString = JSON.stringify(props.data, null, props.indent);
    const highlighted = highlightJson(jsonString);
    return highlighted;
  } catch (error) {
    return '<span class="json-error">Invalid JSON: ' + error + '</span>';
  }
});

function highlightJson(json: string): string {
  const tokens: Array<{type: string, value: string}> = [];
  let i = 0;
  
  while (i < json.length) {
    const char = json.charAt(i);
    
    // Handle strings
    if (char === '"') {
      let str = '"';
      i++;
      while (i < json.length) {
        const currentChar = json.charAt(i);
        const nextChar = json.charAt(i + 1);
        if (currentChar === '\\' && i + 1 < json.length) {
          str += currentChar + nextChar;
          i += 2;
        } else if (currentChar === '"') {
          str += '"';
          i++;
          break;
        } else {
          str += currentChar;
          i++;
        }
      }
      
      // Check if this is a key (followed by colon)
      let j = i;
      while (j < json.length && /\s/.test(json.charAt(j))) j++;
      if (json.charAt(j) === ':') {
        tokens.push({type: 'key', value: str});
      } else {
        tokens.push({type: 'string', value: str});
      }
      continue;
    }
    
    // Handle numbers
    const nextChar = json.charAt(i + 1);
    if (/\d/.test(char) || (char === '-' && i + 1 < json.length && /\d/.test(nextChar))) {
      let num = char;
      i++;
      while (i < json.length && /[\d.]/.test(json.charAt(i))) {
        num += json.charAt(i);
        i++;
      }
      tokens.push({type: 'number', value: num});
      continue;
    }
    
    // Handle booleans and null
    if (char === 't' && json.substring(i, i + 4) === 'true') {
      tokens.push({type: 'boolean', value: 'true'});
      i += 4;
      continue;
    }
    if (char === 'f' && json.substring(i, i + 5) === 'false') {
      tokens.push({type: 'boolean', value: 'false'});
      i += 5;
      continue;
    }
    if (char === 'n' && json.substring(i, i + 4) === 'null') {
      tokens.push({type: 'null', value: 'null'});
      i += 4;
      continue;
    }
    
    // Handle special characters
    if (char === ':') {
      tokens.push({type: 'colon', value: ':'});
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({type: 'comma', value: ','});
      i++;
      continue;
    }
    if (char === '{' || char === '}' || char === '[' || char === ']') {
      tokens.push({type: 'bracket', value: char});
      i++;
      continue;
    }
    
    // Everything else (whitespace, etc.)
    tokens.push({type: 'text', value: char});
    i++;
  }
  
  // Build HTML from tokens
  let result = '';
  for (const token of tokens) {
    switch (token.type) {
      case 'key':
        result += '<span class="json-key">' + token.value + '</span>';
        break;
      case 'string':
        result += '<span class="json-string">' + token.value + '</span>';
        break;
      case 'number':
        result += '<span class="json-number">' + token.value + '</span>';
        break;
      case 'boolean':
        result += '<span class="json-boolean">' + token.value + '</span>';
        break;
      case 'null':
        result += '<span class="json-null">' + token.value + '</span>';
        break;
      case 'colon':
        result += '<span class="json-colon">:</span>';
        break;
      case 'comma':
        result += '<span class="json-comma">,</span>';
        break;
      case 'bracket':
        result += '<span class="json-bracket">' + token.value + '</span>';
        break;
      default:
        result += token.value;
    }
  }
  
  return result;
}
</script>

<style>
.json-formatter {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  padding: 1rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #d4d4d4;
  overflow-x: auto;
  white-space: pre;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.json-string {
  color: #a5d6ff;
}

.json-key {
  color: #79c0ff;
  font-weight: 600;
}

.json-number {
  color: #b5cea8;
}

.json-boolean {
  color: #569cd6;
}

.json-null {
  color: #808080;
  font-style: italic;
}

.json-bracket {
  color: #ffd700;
  font-weight: bold;
}

.json-colon {
  color: #ff6b6b;
  font-weight: bold;
}

.json-comma {
  color: #808080;
}

.json-error {
  color: #ff6b6b;
  font-style: italic;
}

/* Light theme specific */
@media (prefers-color-scheme: light) {
  .json-formatter {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    color: #1f2328;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .json-string {
    color: #032f62;
  }
  
  .json-key {
    color: #0969da;
    font-weight: 600;
  }
  
  .json-number {
    color: #0a3069;
  }
  
  .json-boolean {
    color: #8250df;
  }
  
  .json-bracket {
    color: #6f42c1;
  }
  
  .json-colon {
    color: #cf222e;
  }
}
</style>
