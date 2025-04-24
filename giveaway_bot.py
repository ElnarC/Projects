from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from faker import Faker
from random_word import RandomWords
r = RandomWords()
import time
driver = webdriver.Firefox()

import pyautogui
var = 10



driver.get('https://wn.nr/MnXNYqS')
driver.maximize_window()
pyautogui.keyDown('ctrl')
j: int = 1
for j in range(3):
    pyautogui.press('-')
pyautogui.keyUp('ctrl')

def hackGiveaway():
    WebDriverWait(driver,45).until(
        EC.element_to_be_clickable((By.XPATH, '/html/body/div/div/div/div[1]/div/div/div[1]/div[5]/div[2]/div[3]/div/div[1]/a'))
    )
    email_click = driver.find_element(By.XPATH, '/html/body/div/div/div/div[1]/div/div/div[1]/div[5]/div[2]/div[3]/div/div[1]/a')
    email_click.click()
    time.sleep(0.1569)

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, '/html/body/div/div/div/div[1]/div/div/div[1]/div[5]/div[2]/div[3]/div/div[1]/div/div/form/fieldset[2]/div[2]/div/div/div[1]/label/div[2]/input'))
    )
    name = driver.find_element(By.XPATH, '/html/body/div/div/div/div[1]/div/div/div[1]/div[5]/div[2]/div[3]/div/div[1]/div/div/form/fieldset[2]/div[2]/div/div/div[1]/label/div[2]/input')
    name.send_keys(Faker().name())


    time.sleep(0.2955)
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, '/html/body/div/div/div/div[1]/div/div/div[1]/div[5]/div[2]/div[3]/div/div[1]/div/div/form/fieldset[2]/div[2]/div/div/div[2]/label/div[2]/input'))
    )
    email = driver.find_element(By.XPATH, '/html/body/div/div/div/div[1]/div/div/div[1]/div[5]/div[2]/div[3]/div/div[1]/div/div/form/fieldset[2]/div[2]/div/div/div[2]/label/div[2]/input')
    email.send_keys(r.get_random_word(),"@lolzies.store")
    time.sleep(0.3258)


    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, '/html/body/div/div/div/div[1]/div/div/div[1]/div[5]/div[2]/div[3]/div/div[1]/div/div/form/div/span[1]/button'))
    )
    save = driver.find_element(By.XPATH, '/html/body/div/div/div/div[1]/div/div/div[1]/div[5]/div[2]/div[3]/div/div[1]/div/div/form/div/span[1]/button')
    save.click()
    time.sleep(1)
    driver.delete_all_cookies()
    driver.refresh()
    driver.quit()
    time.sleep(1)
    
    
hackGiveaway()
