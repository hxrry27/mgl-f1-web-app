import csv
import psycopg2
import os
from datetime import datetime
import logging
import unicodedata

logging.basicConfig(
    filename='import_log.txt',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# DB connection
conn = psycopg2.connect(
    dbname="f1telemetry",
    user="postgres",
    password="F>qe~oCFOc9XgpPpFk",
    host="localhost"
)
cur = conn.cursor()

# Name mapping: real name -> DB name (F1 2021-2023 + customs)
name_mapping = {
    # Custom drivers
    "Harry": "hxrry27",
    "Peter": "Evil Tactician",
    "Dave": "Kol_ri",
    "Katie": "Kyuubi0kid",
    "Elliot": "SeerUK",
    "Robert": "Totsuka",
    "Connor": "Xerxes",
    "Gary": "LFFPicard",
    "Iain": "Spacey",
    "James": "Jober",
    "Mike": "MagicallyMichael",
    "Sam": "Kesla",
    # F1 2021-2023 drivers (full name -> surname as in DB)
    "Lewis Hamilton": "Hamilton",
    "George Russell": "Russell",
    "Max Verstappen": "Verstappen",
    "Sergio Perez": "Perez",
    "Charles Leclerc": "Leclerc",
    "Carlos Sainz Jr.": "Sainz",
    "Lando Norris": "Norris",
    "Oscar Piastri": "Piastri",
    "Fernando Alonso": "Alonso",
    "Lance Stroll": "Stroll",
    "Sebastian Vettel": "Vettel",
    "Valtteri Bottas": "Bottas",
    "Zhou Guanyu": "Zhou",
    "Pierre Gasly": "Gasly",
    "Yuki Tsunoda": "Tsunoda",
    "Esteban Ocon": "Ocon",
    "Alexander Albon": "Albon",
    "Logan Sargeant": "Sargeant",
    "Kevin Magnussen": "Magnussen",
    "Nico Hulkenberg": "Hulkenberg",
    "Nico Hülkenberg": "Hulkenberg",
    "Daniel Ricciardo": "Ricciardo",
    "Nyck de Vries": "de Vries",
    "Liam Lawson": "Lawson",
    "Mick Schumacher": "Schumacher",
    "Nicholas Latifi": "Latifi",
    "Antonio Giovinazzi": "Giovinazzi",
    "Kimi Raikkonen": "Raikkonen",
}

# Function to normalize accented characters (e.g., "ã" -> "a")
def normalize_text(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text) if unicodedata.category(c) != 'Mn')

# Function to convert time to milliseconds
def time_to_ms(time_str, is_lap_time=False):
    if not time_str or time_str == '':
        return None
    if is_lap_time:
        if time_str in ("0.0", "0.000"):
            logging.info(f"Lap time '{time_str}' interpreted as 0 ms (incomplete lap)")
            return 0
        try:
            dt = datetime.strptime(time_str, '%M:%S.%f')
            return int(dt.minute * 60000 + dt.second * 1000 + dt.microsecond / 1000)
        except ValueError:
            logging.warning(f"Invalid lap time format '{time_str}', skipping row")
            return None
    else:
        # Sector time: Try "MM:SS.MS" first, then "SS.MS"
        try:
            if ':' in time_str:
                dt = datetime.strptime(time_str, '%M:%S.%f')
                return int(dt.minute * 60000 + dt.second * 1000 + dt.microsecond / 1000)
            return int(float(time_str) * 1000)
        except ValueError:
            logging.warning(f"Invalid sector time format '{time_str}', using None")
            return None

# Fetch race_id mapping from DB
def get_race_mapping(season):
    cur.execute(
        "SELECT r.id, t.slug " +
        "FROM races r JOIN tracks t ON r.track_id = t.id " +
        "WHERE r.season_id = (SELECT id FROM seasons WHERE season = %s)",
        (season,)
    )
    return {row[1].replace('-', ' ').title(): row[0] for row in cur.fetchall()}

# Function to process a single CSV file
def process_csv(file_path, race_id):
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        for row_num, row in enumerate(reader, start=2):
            try:
                driver_name, lap_number, lap_time, s1, s2, s3, tyre = row
                db_name = name_mapping.get(driver_name, driver_name.split()[-1])
                cur.execute("SELECT id FROM drivers WHERE name = %s", (db_name,))
                result = cur.fetchone()
                if not result:
                    logging.warning(f"Driver {db_name} not found in DB for {file_path}")
                    continue
                driver_id = result[0]

                lap_time_int = time_to_ms(lap_time, is_lap_time=True)
                s1_time_int = time_to_ms(s1)
                s2_time_int = time_to_ms(s2)
                s3_time_int = time_to_ms(s3)

                if lap_time_int is None:
                    logging.info(f"Skipping row {row_num} in {file_path}: Invalid lap time '{lap_time}'")
                    continue

                cur.execute(
                    "INSERT INTO lap_times (race_id, driver_id, lap_number, lap_time_int, s1_time_int, s2_time_int, s3_time_int, tyre_compound) " +
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
                    (race_id, driver_id, int(lap_number), lap_time_int, s1_time_int, s2_time_int, s3_time_int, tyre)
                )
            except Exception as e:
                logging.error(f"Error processing row {row_num} in {file_path}: {row} - {str(e)}")

# Main function to process all CSVs
def import_lap_times(base_dir):
    for season_folder in ['lap_data_s8', 'lap_data_s9', 'lap_data_s10']:
        folder_path = os.path.join(base_dir, season_folder)
        if not os.path.exists(folder_path):
            logging.info(f"Folder {folder_path} not found, skipping...")
            continue
        
        season_num = season_folder.split('_s')[1]
        race_mapping = get_race_mapping(season_num)
        logging.info(f"Processing {season_folder} with race mapping: {race_mapping}")

        unmapped_files = []
        for filename in os.listdir(folder_path):
            if filename.endswith('.csv'):
                file_path = os.path.join(folder_path, filename)
                # Clean filename: handle both prefixes and normalize accents
                track_name_raw = filename.replace('export_lapdata_', '').replace('export_results_', '').replace('_race.csv', '').replace('-', ' ')
                track_name = normalize_text(track_name_raw).title()
                race_id = race_mapping.get(track_name)
                if not race_id:
                    unmapped_files.append(filename)
                    logging.warning(f"No race_id mapping for {track_name} in season {season_num}, skipping...")
                    continue
                
                logging.info(f"Importing {file_path} with race_id {race_id}")
                process_csv(file_path, race_id)
                conn.commit()
        
        if unmapped_files:
            logging.info(f"Unmapped files in {season_folder}: {unmapped_files}")

# Run the import
base_directory = 'C:/Users/harry/Downloads'
import_lap_times(base_directory)

# Cleanup
cur.close()
conn.close()
logging.info("All CSVs imported successfully!")