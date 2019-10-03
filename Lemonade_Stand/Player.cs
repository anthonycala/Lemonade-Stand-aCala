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

    }

}
