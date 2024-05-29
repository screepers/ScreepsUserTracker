import logging
import os

def create_file_if_doesnt_exist(file_path):
    # Create the directory if it doesn't exist
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    # Create the file if it doesn't exist
    with open(file_path, 'a'):
        pass

def create_logger(log_file):
    create_file_if_doesnt_exist(log_file)
  
    logger = logging.getLogger(log_file)
    logger.setLevel(logging.DEBUG)

    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)

    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    
    return logger

class Logger:
    def __init__(self, log_file_title):
        self.logger = create_logger(f"logs/{log_file_title}.log")

    def log(self, message, level=logging.INFO):
        if level == logging.INFO:
            self.info(message)
        elif level == logging.ERROR:
            self.error(message)
        elif level == logging.DEBUG:
            self.debug(message)
        else:
            self.logger.log(level, message)

    def info(self, message):
        self.logger.info(message)

    def error(self, message):
        self.logger.error(message,exc_info=True)

    def debug(self, message):
        self.logger.debug(message)