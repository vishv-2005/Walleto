import os
import random
import csv
from datetime import timedelta, datetime

OUT_PATH = os.path.join("data", "messages.csv")
RANDOM_SEED = 42
TARGET_PER_CLASS = 300  # total ~900

random.seed(RANDOM_SEED)

ORDER_TEMPLATES = [
	"I want to order {plan} plan",
	"Please upgrade my package to {plan}",
	"I'd like a new connection at {address}",
	"Can I add {addon} to my subscription?",
	"Schedule installation for {date} at {address}",
	"I'd like to order a set-top box for {room}",
	"Place an order for {channels} channels package",
	"Sign me up for {plan} with {addon}",
	"Start a new service at {address} on {date}",
	"Order ID {oid}: confirm activation",
]

COMPLAINT_TEMPLATES = [
	"Internet is down since {time}",
	"My TV signal keeps dropping",
	"Very slow speed, I'm getting only {mbps} Mbps",
	"Billing shows extra charges for {month}",
	"Technician didn't arrive for the appointment",
	"Frequent outages in my area {zipcode}",
	"Remote not working and the box keeps restarting",
	"No channels after payment, please fix",
	"App streaming buffers every few minutes",
	"Cable line is damaged outside my house",
]

INQUIRY_TEMPLATES = [
	"Do you service {zipcode}?",
	"What are the prices for {plan} plan?",
	"How long does installation take?",
	"Is there a contract for {months} months?",
	"What's the data cap on {plan}?",
	"Do you offer weekend installation?",
	"What is the early termination fee?",
	"Can I pause service while I'm away?",
	"Which channels are included in {channels} package?",
	"Do you have student discounts?",
]

PLANS = ["Basic", "Standard", "Premium", "Gigabit", "Fiber 500", "Sports Max"]
ADDONS = ["sports pack", "kids pack", "HBO", "4K DVR", "multi-room DVR", "international pack"]
ROOMS = ["living room", "bedroom", "basement", "office"]
CHANNEL_PACKS = ["sports", "news", "family", "movies", "international"]
ZIPCODES = [f"{z:05d}" for z in [94107, 10001, 33101, 60601, 75001, 85001, 77001]]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def rand_date():
	start = datetime(2025, 1, 1)
	delta_days = random.randint(0, 180)
	return (start + timedelta(days=delta_days)).strftime("%Y-%m-%d")


def rand_time():
	return f"{random.randint(1,12)}:{random.choice(['00','15','30','45'])} {random.choice(['AM','PM'])}"


def rand_address():
	num = random.randint(10, 9999)
	street = random.choice(["Maple St", "Oak Ave", "Pine Rd", "Cedar Blvd", "Elm St"])
	city = random.choice(["San Francisco", "New York", "Miami", "Chicago", "Dallas", "Phoenix", "Houston"])
	zipc = random.choice(ZIPCODES)
	return f"{num} {street}, {city} {zipc}"


def rand_oid():
	return f"#{random.randint(1000,9999)}"


def rand_mbps():
	return random.choice([1, 5, 10, 25, 50, 100, 200])


def maybe_noise(text: str) -> str:
	# Light variants to increase realism
	prefix = random.choice(["", "Hi, ", "Hello, ", "Hey, "])
	suffix = random.choice(["", " thanks", " please", " asap", " urgent"])
	punct = random.choice([".", "!", "", "..."])
	return f"{prefix}{text}{suffix}{punct}"


def render(template: str) -> str:
	return template.format(
		plan=random.choice(PLANS),
		addon=random.choice(ADDONS),
		address=rand_address(),
		date=rand_date(),
		room=random.choice(ROOMS),
		channels=random.choice(CHANNEL_PACKS),
		oid=rand_oid(),
		time=rand_time(),
		mbps=rand_mbps(),
		month=random.choice(MONTHS),
		zipcode=random.choice(ZIPCODES),
		months=random.choice([6, 12, 24]),
	)


def synthesize_samples(n_per_class: int):
	rows = []
	for _ in range(n_per_class):
		rows.append([maybe_noise(render(random.choice(ORDER_TEMPLATES))), "order"])
	for _ in range(n_per_class):
		rows.append([maybe_noise(render(random.choice(COMPLAINT_TEMPLATES))), "complaint"])
	for _ in range(n_per_class):
		rows.append([maybe_noise(render(random.choice(INQUIRY_TEMPLATES))), "inquiry"])
	random.shuffle(rows)
	return rows


def main():
	os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
	rows = synthesize_samples(TARGET_PER_CLASS)
	with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
		writer = csv.writer(f)
		writer.writerow(["message_text", "category"])
		writer.writerows(rows)
	print(f"Wrote {len(rows)} rows to {OUT_PATH}")


if __name__ == "__main__":
	main()
