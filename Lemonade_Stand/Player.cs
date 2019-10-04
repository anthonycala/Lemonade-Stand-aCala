using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Lemonade_Stand
{
    class Player
    {

        //member variables (Has A)
        public string name;
        public Inventory inventory;
        public Wallet wallet;
        public Recipe recipe;
        public Pitcher pitcher;
        public double businessProfits;




        // Constructor
        public Player()
        {
            name = PlayersName();
            inventory = new Inventory();
            wallet = new Wallet();
            recipe = new Recipe();
            pitcher = new Pitcher();
            businessProfits = 0;
        }





        // member methods

        public string PlayersName()
        {
            Console.WriteLine("Enter your name");
            name = Console.ReadLine();
            return name;
        }
        public int pourPitcher()
        {
            Console.WriteLine("How many pitchers do you want to make");
            int numOfPitchers = int.Parse(Console.ReadLine());
            return numOfPitchers;
        }
        public void adjustInventory(int numOfPitchers)
        {
            int usedLemons = numOfPitchers * recipe.amountOfLemons;
            int usedSugarCubes = numOfPitchers * recipe.amountOfSugarCubes;
            int usedIceCubes = numOfPitchers * recipe.amountOfIceCubes;
            int usedCups = numOfPitchers * pitcher.cupsLeftInPitcher;
            adjustLemons(usedLemons);
            adjustSugarCubes(usedSugarCubes);
            adjustIceCubes(usedIceCubes);
            adjustCupsUsed(usedCups);
            
        }
        public void adjustLemons(int usedLemons)
        {
            for (int i = 0; i < usedLemons; i++)
            {
                inventory.Lemons.RemoveAt(0);
            }

        }
        public void adjustSugarCubes(int usedSugarCubes)
        {
            for (int i = 0; i < usedSugarCubes; i++)
            {
                inventory.SugarCubes.RemoveAt(0);
            }

        }
        public void adjustIceCubes(int usedIceCubes)
        {
            for (int i = 0; i < usedIceCubes; i++)
            {
                inventory.IceCubes.RemoveAt(0);
            }
        }
        public void adjustCupsUsed(int usedCups)
        {
            for (int i = 0; i < usedCups; i++)
            {
                inventory.Cups.RemoveAt(0);
            }
        }
    }
}
