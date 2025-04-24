"""This program creates a calendar that the user can interact with. It allows the user to do tasks such as: view the calendar, add an event to the calendar, update an event, delete an event"""
from time import sleep, strftime

name = input("What is your name: ")

calendar = {}


def welcome():
  print("Welcome %s!" % (name))
  print("Calendar is opening...")
  sleep(1)
  print(strftime("%A, %B, %d, %Y\n") + strftime("%H:%M:%S"))
  sleep(1)
  print("What would you like to do?")


def start_calendar():
  welcome()
  start = True
  while start:
    user_chocie = input(
        "A to Add\nU to Update\nV to View\nD to Delete\nX to Exit\nYour Choice: "
    )
    user_chocie = user_chocie.upper()
    if user_chocie == "V":
      if len(calendar.keys()) < 1:
        print("Calendar is empty.")
      else:
        print(calendar)
    elif user_chocie == "U":
      date = input("What date:")
      update = input("Enter the update: ")
      calendar[date] = update
      print("The update was successful!")
      print(calendar)
    elif user_chocie == "A":
      event = input("Enter event: ")
      date = input("Enter date (MM/DD/YYYY): ")
      if len(date) > 10 or int(date[6:]) < int(strftime("%Y")):
        print("Invalid date was entered! ")
        try_again = input("Try Again?\nY for Yes\nN for No\nYour Choice: ")
        try_again = try_again.upper()
        if try_again == "Y":
          continue
        else:
          start = False
      else:
        calendar[date] = event
        print("An Event Was Successfully Added! ")
        print(calendar)
    elif user_chocie == "D":
      if len(calendar.keys()) < 1:
        print("Calendar Is Empty!")
      else:
        event = input("What Event: ")
        for date in list(calendar):
          if event == calendar[date]:
            del (calendar[date])
            print("An Event Was Successfully Deleted!")
            print(calendar)
          else:
            print("An Incorrect Event Was Entered!")
    elif user_chocie == "X":
      print("Calendar Closing")
      sleep(1)
      start = False
    else:
      print("Invalid Command Was Entered!")


start_calendar()
