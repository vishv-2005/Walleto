import pandas as pd
import random
import string

# Load existing data
df = pd.read_csv('../data/messages.csv')

# Function to generate random gibberish
def generate_gibberish(length=10):
    return ''.join(random.choices(string.ascii_lowercase + string.digits + ' ', k=random.randint(5, 30)))

# Add more invalid examples
invalid_examples = [
    # Keyboard mashing and random characters
    "asdfghjkl qwertyuiop",
    "12345 67890 !@#$%^",
    "qazwsx edcrfv tgb yhn ujm",
    "!@#$%^&*()_+{}\\\\|\"';:?><,./[]",
    "asd asd asd asd asd",
    "123 testing 123 testing",
    "qazwsxedcrfvtgbyhnujmik,ol.",
    "zxcvbnm,./asdfghjkl;'qwertyuiop[]\\",
    "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik,9ol.0p;/-['=]\\",
    "!@#$%^&*()_+{}|:\"<>?~`1234567890-=\\`",
    
    # Repeated patterns
    "test test test test",
    "123 123 123 123",
    "abc abc abc abc",
    "asdf asdf asdf asdf",
    "qwe qwe qwe qwe",
    
    # Mixed scripts and languages
    "hello 你好 привет こんにちは 안녕하세요",
    "asdf こんにちは qwerty",
    "123 привет 456",
    "!@# 你好 !@#",
    "test テスト test",
    
    # Nonsensical combinations
    "the quick brown fox jumps over 123 !@#",
    "lorem ipsum dolor sit amet 12345",
    "random words that don't make sense together",
    "this is not a valid message please ignore",
    "just some random text with 123 and !@#",
    
    # Special character strings
    "!@#$%^&*()_+{}\\\\|\"';:?><,./[]`~",
    "`~!@#$%^&*()_+-=[]\\{}|;':\",./<>?",
    "¡™£¢∞§¶•ªº–≠œ∑´®†¥¨ˆøπ“‘«åß∂ƒ©˙∆˚¬…æΩ≈ç√∫~µ",
    "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁱⁿ",
    "ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ",
    
    # Emoji and symbols
    "😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋",
    "♠♥♦♣•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼",
    "⌂☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼",
    "▁▂▃▄▅▆▇█▓▒░▀▄▌▐▬◘◙◄↨♂♀♪♫☼►◄↕‼¶§▬",
    "¯\(°_o)/¯ ٩(◕‿◕｡)۶ (╯°□°）╯︵ ┻━┻ ༼ つ ◕_◕ ༽つ",
    
    # Incomplete or malformed text
    "asdfghjkl;'\n\r\t",
    "...",
    "----",
    "??????",
    "!!!!!",
    
    # Long repeated patterns
    "a" * 50,
    "123 " * 20,
    "test " * 15,
    "!@# " * 25,
    "qwertyuiop" * 5,
    "1234567890-=qwertyuiop[]\\\\asdfghjkl;'zxcvbnm,./",
    "!@#$%^&*()_+{}|:\"<>?~`1234567890-=[]\\\\;',./",
    "asdfghjklqwertyuiopzxcvbnm,./;'[]\\\\",
    "qwertyuiopasdfghjklzxcvbnm,./;'[]\\\\",
    "1234567890qwertyuiopasdfghjklzxcvbnm,./;'[]\\\\",
    "!@#$%^&*()_+{}|:\"<>?~`1234567890-=[]\\\\;',./qwertyuiopasdfghjklzxcvbnm",
    "asdfghjklqwertyuiopzxcvbnm,./;'[]\\\\1234567890-=\\\\`~!@#$%^&*()_+{}|:\"<>?",
    "qwertyuiop[]\\\\asdfghjkl;'zxcvbnm,./1234567890-=\\\\`~!@#$%^&*()_+{}|:\"<>?"
]

# Add 100 more random gibberish examples
for _ in range(100):
    invalid_examples.append(generate_gibberish())

# Create DataFrame for invalid examples
invalid_df = pd.DataFrame({
    'message': invalid_examples,
    'category': ['invalid'] * len(invalid_examples)
})

# Combine with original data
enhanced_df = pd.concat([df, invalid_df], ignore_index=True)

# Save enhanced dataset
enhanced_df.to_csv('../data/enhanced_messages.csv', index=False)
print(f"Enhanced dataset saved with {len(enhanced_df)} total examples")
print("Category distribution:")
print(enhanced_df['category'].value_counts())
