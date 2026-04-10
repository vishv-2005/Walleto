import pandas as pd
import itertools
import random
import os

def generate_combinations(template_list):
    """Generates all combinations from a list of list of strings."""
    # Remove empty strings at generation to allow optional components
    results = []
    for t in itertools.product(*template_list):
        # Join with spaces, skipping empty parts
        sentence = " ".join([word.strip() for word in t if word.strip()])
        results.append(sentence)
    return results

def generate_data():
    random.seed(42)
    data = []

    # --- 1. ORDERS ---
    # English Order Templates
    en_order_prefixes = ["I want to", "Please", "Can I get", "I need", "I'd like to", "Looking to", "Hey, I want to", "Could you", "I am looking for"]
    en_order_intent = ["order", "purchase", "buy", "place an order for", "get", "add", "book"]
    en_order_items = ["a large pizza", "5 cakes", "biryani", "the premium plan", "a combo meal", "some groceries", "a replacement part", "the new model", "office supplies", "10 units"]
    en_order_suffixes = ["please", "asap", "now", "by tomorrow", "delivered to my house", "urgently", "for my party", ""]
    
    en_orders = generate_combinations([en_order_prefixes, en_order_intent, en_order_items, en_order_suffixes])

    # Hinglish Order Templates
    hin_order_prefixes = ["Mujhe", "Mera", "Ek", "Bhai", "Sir", "Please", "Mujhay"]
    hin_order_intent = ["order karna hai", "chahiye", "dedo", "pack kar do", "book karna", "bhej do", "lagana hai"]
    hin_order_items = ["cake", "pizza", "biryani", "laptop", "phone", "premium plan", "paani ki bottle", "saman"]
    hin_order_suffixes = ["jaldi", "plz", "urgent", "kal tak", "abhi", "fast", ""]

    hin_orders = generate_combinations([hin_order_prefixes, hin_order_items, hin_order_intent, hin_order_suffixes])

    # Follow up updates (Intelligent order updates)
    upd_prefixes = ["instead of", "change it to", "cancel that and make it", "update my order to", "make that", "bhai isko change kar do,", "uske badle"]
    upd_items = ["3", "5 items", "large size", "small size", "2 quantity"]
    upd_orders = generate_combinations([upd_prefixes, upd_items])

    all_orders = en_orders + hin_orders + upd_orders
    all_orders = random.choices(all_orders, k=3000)
    for msg in all_orders:
        data.append({"message": msg, "label": "order"})

    # --- 2. INQUIRY ---
    en_inq_prefixes = ["What is the", "Can you tell me the", "I want to know the", "Could you explain the", "How much is the", "Do you have any info on", "Just wondering about your", "Query regarding"]
    en_inq_topics = ["price", "cost", "delivery time", "business hours", "return policy", "warranty", "vegan options", "international shipping", "discount", "basic package"]
    en_inq_suffixes = ["?", "please?", "currently?", "for this item?", ""]

    en_inqs = generate_combinations([en_inq_prefixes, en_inq_topics, en_inq_suffixes])

    hin_inq_prefixes = ["Kya", "Ye batana", "Bhai", "Sir,", "Please batao", "Isko lene ke", "Mera question hai ki"]
    hin_inq_topics = ["price kya hai", "kitne ka hai", "kab tak ayega", "return hoga kya", "discount milega", "shop open hai kya", "delivery charges kitne hain", "warranty kitni hai"]
    hin_inq_suffixes = ["?", "plz?", "jaldi batao", ""]

    hin_inqs = generate_combinations([hin_inq_prefixes, hin_inq_topics, hin_inq_suffixes])
    
    all_inqs = en_inqs + hin_inqs
    all_inqs = random.choices(all_inqs, k=3000)
    for msg in all_inqs:
        data.append({"message": msg, "label": "inquiry"})

    # --- 3. COMPLAINT ---
    en_comp_prefixes = ["This is", "I am", "I feel", "What a", "Absolutely"]
    en_comp_sentiments = ["terrible", "worst", "unacceptable", "horrible", "awful", "very disappointed with", "very angry about", "frustrated by"]
    en_comp_objects = ["service", "experience", "the delivery", "the product", "the quality", "my recent order", "customer support"]
    en_comp_suffixes = ["!", "Never again.", "Fix this.", "I want a refund.", "It was broken.", "Late by 3 days.", ""]

    en_comps = generate_combinations([en_comp_prefixes, en_comp_sentiments, en_comp_objects, en_comp_suffixes])

    hin_comp_prefixes = ["Bahut hi", "Kya bakwas", "Ekdam", "Bhai maine", "Sir yeh"]
    hin_comp_sentiments = ["bekar", "ghatiya", "kharaab", "late", "damage", "faltu"]
    hin_comp_objects = ["service hai", "order tha", "delivery kiya hai", "product bhej diya", "khana tha"]
    hin_comp_suffixes = ["!", "Refund chahiye.", "Kaun khayega yeh?", "Mood kharab kar diya.", "Aisa thodi hota hai.", "Paisa wapas karo."]

    hin_comps = generate_combinations([hin_comp_prefixes, hin_comp_sentiments, hin_comp_objects, hin_comp_suffixes])

    all_comps = en_comps + hin_comps
    all_comps = random.choices(all_comps, k=3000)
    for msg in all_comps:
        data.append({"message": msg, "label": "complaint"})

    # --- 4. FEEDBACK ---
    en_feed_prefixes = ["I", "Absolutely", "Just wanted to say I", "Overall, the", "We"]
    en_feed_sentiments = ["love", "really like", "enjoyed", "am impressed by", "appreciate", "highly recommend"]
    en_feed_objects = ["the cakes", "the service", "this product", "the delivery speed", "your support team", "the quality", "the package", "everything"]
    en_feed_suffixes = ["it is good", "they are good", "so amazing!", "thank you!", "great job", "will buy again", "5 stars", "😊", "❤️", "👍"]

    en_feeds = generate_combinations([en_feed_prefixes, en_feed_sentiments, en_feed_objects, en_feed_suffixes])

    hin_feed_prefixes = ["Bhai", "Sir", "Bohot", "Ek number", "Sach mein"]
    hin_feed_sentiments = ["maza aa gaya", "mast tha", "badhiya hai", "zabardast", "acha laga", "superb"]
    hin_feed_objects = ["cakes", "khana", "service", "delivery", "quality", "response"]
    hin_feed_suffixes = ["bhai", "thank u", "keep it up", "phir se order karunga", "dil khush kar diya", "😍", "👌"]

    hin_feeds = generate_combinations([hin_feed_prefixes, hin_feed_objects, hin_feed_sentiments, hin_feed_suffixes])

    # specific user edge case:
    hin_feeds.append("the cakes are good")
    hin_feeds.append("cake accha tha")

    all_feeds = en_feeds + hin_feeds
    all_feeds = random.choices(all_feeds, k=3000)
    for msg in all_feeds:
        data.append({"message": msg, "label": "feedback"})

    # --- 5. INVALID ---
    invalid_strs = ["asdsa", "qwerty", "12345", "test", "hello", "hi", "ok", "yo", "hmm", "...", "?", "!!", "bruh", "lol", "idk"]
    random_chars = ["a", "z", "x", "p", "m", "j", "q"]
    
    # Generate random gibberish
    all_invalids = []
    
    for _ in range(2000):
        # Join random invalid strings
        length = random.randint(1, 4)
        msg = " ".join(random.choices(invalid_strs, k=length))
        all_invalids.append(msg)
        
    for _ in range(1000):
        # Keyboard smashes
        length = random.randint(5, 15)
        msg = "".join(random.choices(random_chars, k=length))
        all_invalids.append(msg)
        
    all_invalids = list(set(all_invalids))
    # If set deduplication reduces count below 3000, pad it
    while len(all_invalids) < 3000:
        all_invalids.append( "".join(random.choices(random_chars, k=10)) + str(random.random()) )
        
    random.shuffle(all_invalids)
    all_invalids = all_invalids[:3000]
    for msg in all_invalids:
        data.append({"message": msg, "label": "invalid"})

    # Ensure absolute 15k rows exactly
    df = pd.DataFrame(data)
    
    # Validation
    counts = df['label'].value_counts()
    print("Generated Label distribution:")
    print(counts)
    
    csv_path = os.path.join(os.path.dirname(__file__), "synthetic_data_15k.csv")
    df.to_csv(csv_path, index=False)
    print(f"\nTotal {len(df)} records saved to {csv_path}")

if __name__ == "__main__":
    generate_data()
