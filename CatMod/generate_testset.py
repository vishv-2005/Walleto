import pandas as pd
import itertools
import random
import os

def generate_combinations(template_list):
    results = []
    for t in itertools.product(*template_list):
        sentence = " ".join([word.strip() for word in t if word.strip()])
        results.append(sentence)
    return results

def generate_test_data():
    # Use different seed for testset to vary sampling
    random.seed(99)
    data = []

    # --- 1. ORDERS ---
    en_order_prefixes = ["I'd like to get", "Could you prepare", "I want", "Can we order", "Please secure"]
    en_order_intent = ["an order for", "a delivery of", "a pickup for", ""]
    en_order_items = ["a small pizza", "2 cakes", "chicken biryani", "the standard plan", "water bottles", "the recent model", "some pens", "3 units"]
    en_order_suffixes = ["for me", "asap", "by tonight", "delivered to office", "urgently", "for the meeting"]
    
    en_orders = generate_combinations([en_order_prefixes, en_order_intent, en_order_items, en_order_suffixes])

    hin_order_prefixes = ["Mujhe", "Ek", "Bhaiya", "Please ek", "Mujhay"]
    hin_order_intent = ["karna hai order", "chahiye jaldi", "de dena", "pack karvana hai", "book kar do"]
    hin_order_items = ["cake", "pizza", "biryani", "laptop", "mobile", "plan", "biscuits"]
    hin_order_suffixes = ["kal", "plz", "urgent", "sham tak", "fast", ""]

    hin_orders = generate_combinations([hin_order_prefixes, hin_order_items, hin_order_intent, hin_order_suffixes])

    all_orders = en_orders + hin_orders
    all_orders = random.choices(all_orders, k=1500)
    for msg in all_orders:
        data.append({"message": msg, "label": "order"})

    # --- 2. INQUIRY ---
    en_inq_prefixes = ["Can you provide the", "I'd like to know the", "Could someone explain the", "Any info on", "Quick question about"]
    en_inq_topics = ["exact price", "total cost", "late delivery", "shop timings", "refund policy", "guarantee", "veg menu", "overseas shipping", "current discount"]
    en_inq_suffixes = ["?", "please?", "now?", "for my order?", ""]

    en_inqs = generate_combinations([en_inq_prefixes, en_inq_topics, en_inq_suffixes])

    hin_inq_prefixes = ["Batao zara", "Ye batao", "Bhai", "Sir,", "Please clear karna", "Kripya batayein"]
    hin_inq_topics = ["price kitti hai", "kitne ka padega", "kab milega", "return kaise hoga", "discount hai kya", "kab khulta hai shop"]
    hin_inq_suffixes = ["?", "plz?", ""]

    hin_inqs = generate_combinations([hin_inq_prefixes, hin_inq_topics, hin_inq_suffixes])
    
    all_inqs = en_inqs + hin_inqs
    all_inqs = random.choices(all_inqs, k=1500)
    for msg in all_inqs:
        data.append({"message": msg, "label": "inquiry"})

    # --- 3. COMPLAINT ---
    en_comp_prefixes = ["This is", "I'm", "Honestly", "So", "Completely"]
    en_comp_sentiments = ["dreadful", "the worst", "unacceptable", "horrendous", "very disappointed by", "pissed off about"]
    en_comp_objects = ["the horrible service", "that experience", "this delay", "the broken product", "my latest buy", "the support"]
    en_comp_suffixes = ["!", "Never shopping here again.", "Please resolve.", "Refund me.", "It arrived shattered.", "Extremely late."]

    en_comps = generate_combinations([en_comp_prefixes, en_comp_sentiments, en_comp_objects, en_comp_suffixes])

    hin_comp_prefixes = ["Ye bahut hi", "Gajab bakwas", "Ek no. ka", "Bhai kya", "Sir yeh itna"]
    hin_comp_sentiments = ["khatara", "raddi", "kharaab", "late", "damage", "faltu"]
    hin_comp_objects = ["kaam hai", "item tha", "bheja hai", "khana mila"]
    hin_comp_suffixes = ["!", "Paisa do wapas.", "Kutte bhi na khaye.", "Dimag kharab.", "Thug liya.", "Report karunga."]

    hin_comps = generate_combinations([hin_comp_prefixes, hin_comp_sentiments, hin_comp_objects, hin_comp_suffixes])

    all_comps = en_comps + hin_comps
    all_comps = random.choices(all_comps, k=1500)
    for msg in all_comps:
        data.append({"message": msg, "label": "complaint"})

    # --- 4. FEEDBACK ---
    en_feed_prefixes = ["I just", "Absolutely", "Wanted to add I", "In summary, the", "My family"]
    en_feed_sentiments = ["adore", "loved", "cherished", "am wowed by", "value", "suggest"]
    en_feed_objects = ["your cakes", "the prompt service", "this brand", "the fast shipping", "your team", "the standard", "the gift wrap", "the meal"]
    en_feed_suffixes = ["it is fantastic", "they are awesome", "mind blowing!", "thanks!", "excellent", "buy it again", "five stars", "💯", "🔥", "🤩"]

    en_feeds = generate_combinations([en_feed_prefixes, en_feed_sentiments, en_feed_objects, en_feed_suffixes])

    hin_feed_prefixes = ["Bhai", "Sir", "Bohot jyada", "Ek no.", "Kasam se"]
    hin_feed_sentiments = ["sukoon aa gaya", "lajawab tha", "badhiya tha", "zabardast lagga", "acha tha", "superb"]
    hin_feed_objects = ["cakes", "khana", "service", "delivery", "quality", "behavior"]
    hin_feed_suffixes = ["yaar", "thanks u", "aage bhi lunga", "phir se order lagaya", "khush ho gaye", "😍", "👍"]

    hin_feeds = generate_combinations([hin_feed_prefixes, hin_feed_objects, hin_feed_sentiments, hin_feed_suffixes])

    all_feeds = en_feeds + hin_feeds
    all_feeds = random.choices(all_feeds, k=1500)
    for msg in all_feeds:
        data.append({"message": msg, "label": "feedback"})

    # --- 5. INVALID ---
    invalid_strs = ["zxczxc", "uiop", "67890", "check", "hola", "bye", "hmm", ":::", "!!!", "?!", "bruhh", "lmfao", "wut"]
    random_chars = ["b", "c", "d", "y", "n", "k", "l"]
    
    all_invalids = []
    
    for _ in range(1000):
        length = random.randint(1, 4)
        msg = " ".join(random.choices(invalid_strs, k=length))
        all_invalids.append(msg)
        
    for _ in range(500):
        length = random.randint(5, 15)
        msg = "".join(random.choices(random_chars, k=length))
        all_invalids.append(msg)
        
    all_invalids = random.choices(all_invalids, k=1500)
    for msg in all_invalids:
        data.append({"message": msg, "label": "invalid"})

    df = pd.DataFrame(data)
    
    counts = df['label'].value_counts()
    print("Generated Testset Label distribution:")
    print(counts)
    
    # Save directly over the project root testset.csv
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "testset.csv"))
    df.to_csv(csv_path, index=False)
    print(f"\nTotal {len(df)} records saved to {csv_path} for testing!")

if __name__ == "__main__":
    generate_test_data()
