<?php

namespace App\VoltTests;

use VoltTest\Laravel\Contracts\VoltTestCase;
use VoltTest\Laravel\VoltTestManager;

class HomeTest implements VoltTestCase
{
    /**
     * Define the test scenario.
     *
     * @param VoltTestManager $manager
     * @return void
     */
    public function define(VoltTestManager $manager): void
    {
        // Define your test scenario
        $scenario = $manager->scenario('HomeTest');
        $scenario->step('Check route')
                ->get('/testing')
                ->expectStatus(200)
                ;

// No routes selected
    }
}